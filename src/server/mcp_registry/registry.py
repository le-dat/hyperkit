"""MCP server registry — connect, health-check, tool discovery, and tool calling."""

import os
import structlog
from contextlib import AsyncExitStack
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.sse import sse_client


logger = structlog.get_logger(__name__)

WORKSPACE_DIR = os.getenv("MCP_WORKSPACE_DIR", "/tmp/agent-workspace")


@dataclass
class MCPServer:
    name: str
    transport: str  # "stdio" | "http"
    command: list[str] | None = None  # stdio only
    url: str | None = None  # http only
    enabled: bool = True
    tools: list[dict[str, Any]] = None
    is_healthy: bool = False
    last_check: datetime | None = None

    def __post_init__(self):
        if self.tools is None:
            self.tools = []


class MCPRegistry:
    """Registry of MCP server connections with health monitoring."""

    def __init__(self):
        self._servers: dict[str, MCPServer] = {}
        self._sessions: dict[str, ClientSession] = {}
        self._session_stacks: dict[str, AsyncExitStack] = {}
        self._user_servers: dict[tuple[str, str], MCPServer] = {}
        self._user_sessions: dict[tuple[str, str], ClientSession] = {}
        self._user_session_stacks: dict[tuple[str, str], AsyncExitStack] = {}

    # ── Registration ────────────────────────────────────────────────────

    def register(self, server: MCPServer) -> None:
        self._servers[server.name] = server
        logger.info("mcp_server_registered", name=server.name, transport=server.transport)

    # ── Connection ──────────────────────────────────────────────────────

    async def connect(self, name: str) -> ClientSession:
        """Connect to a registered MCP server, caching the session."""
        if name in self._sessions:
            existing = self._sessions[name]
            # Check if session is still usable (has not been closed)
            try:
                if hasattr(existing, "_read_stream") and not existing._read_stream.is_closed:
                    return existing
            except Exception:
                pass  # Fall through to reconnect

        cfg = self._servers[name]
        stack = AsyncExitStack()

        try:
            if cfg.transport == "stdio":
                if not cfg.command:
                    raise ValueError(f"stdio transport for {name} requires command list")
                params = StdioServerParameters(command=cfg.command[0], args=cfg.command[1:])
                read, write = await stack.enter_async_context(stdio_client(params))
            elif cfg.transport in ("http", "sse"):
                if not cfg.url:
                    raise ValueError(f"{cfg.transport} transport for {name} requires url")
                read, write = await stack.enter_async_context(sse_client(cfg.url))
            else:
                raise ValueError(f"Unknown transport: {cfg.transport}")

            session = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            self._sessions[name] = session
            self._session_stacks[name] = stack

            # Discover available tools
            result = await session.list_tools()
            cfg.tools = [t.model_dump() for t in result.tools]
            cfg.is_healthy = True
            cfg.last_check = datetime.utcnow()

            logger.info("mcp_server_connected", name=name, num_tools=len(cfg.tools))
            return session
        except Exception:
            await stack.aclose()
            raise

    # ── Tool operations ─────────────────────────────────────────────────

    async def call_tool(self, server: str, tool: str, args: dict[str, Any]) -> dict[str, Any]:
        """Call a tool on a connected MCP server."""
        try:
            s = await self.connect(server)
        except Exception as e:
            logger.error("mcp_connect_failed", server=server, tool=tool, error=str(e))
            raise ValueError(f"MCP server '{server}' is not available: {e}") from e

        try:
            result = await s.call_tool(tool, arguments=args)
            return {"content": result.content, "is_error": result.isError}
        except Exception as e:
            logger.error("mcp_tool_call_failed", server=server, tool=tool, error=str(e))
            raise ValueError(f"MCP tool '{tool}' failed on server '{server}': {e}") from e

    async def all_tools(self) -> list[dict[str, Any]]:
        """Return all tools from all enabled servers, tagged with server name."""
        return [
            {**t, "_server": name}
            for name, cfg in self._servers.items()
            if cfg.enabled
            for t in cfg.tools
        ]

    # ── Health / status ────────────────────────────────────────────────

    async def check_health(self, name: str) -> bool:
        """Ping a server by refreshing its session."""
        try:
            cfg = self._servers[name]
            # Close existing session to force reconnect
            if name in self._sessions:
                await self.close_session(name)
            await self.connect(name)
            cfg.is_healthy = True
            cfg.last_check = datetime.utcnow()
            logger.info("mcp_health_check_ok", name=name)
            return True
        except Exception as e:
            self._servers[name].is_healthy = False
            logger.warning("mcp_health_check_failed", name=name, error=str(e))
            return False

    def status(self) -> list[dict[str, Any]]:
        return [
            {
                "name": cfg.name,
                "transport": cfg.transport,
                "healthy": cfg.is_healthy,
                "tools": len(cfg.tools),
                "last_check": cfg.last_check.isoformat() if cfg.last_check else None,
            }
            for cfg in self._servers.values()
        ]

    # ── User-specific dynamic connection (Multi-Tenant) ──────────────────

    async def connect_user(self, user_id: str, name: str, custom_env: dict[str, str]) -> ClientSession:
        """Connect to a user-specific dynamic MCP server, caching the session."""
        session_key = (user_id, name)
        if session_key in self._user_sessions:
            existing = self._user_sessions[session_key]
            try:
                if hasattr(existing, "_read_stream") and not existing._read_stream.is_closed:
                    return existing
            except Exception:
                pass  # Fall through to reconnect

        from mcp_registry.catalog import MCP_CATALOG
        if name not in MCP_CATALOG:
            raise ValueError(f"Server {name} not found in catalog")

        catalog_item = MCP_CATALOG[name]

        # Merge system environment with user-specific keys
        process_env = os.environ.copy()
        process_env.update(custom_env)

        command = catalog_item.command.copy()
        if name == "filesystem":
            workspace_path = custom_env.get("MCP_FILESYSTEM_PATH", WORKSPACE_DIR)
            os.makedirs(workspace_path, exist_ok=True)
            command.append(workspace_path)

        params = StdioServerParameters(
            command=command[0],
            args=command[1:],
            env=process_env
        )

        stack = AsyncExitStack()
        try:
            read, write = await stack.enter_async_context(stdio_client(params))
            session = await stack.enter_async_context(ClientSession(read, write))
            await session.initialize()

            self._user_sessions[session_key] = session
            self._user_session_stacks[session_key] = stack

            # Discover tools
            result = await session.list_tools()
            tools_list = [t.model_dump() for t in result.tools]

            self._user_servers[session_key] = MCPServer(
                name=name,
                transport="stdio",
                command=command,
                enabled=True,
                tools=tools_list,
                is_healthy=True,
                last_check=datetime.utcnow()
            )

            logger.info("mcp_user_server_connected", user_id=user_id, name=name, num_tools=len(tools_list))
            return session
        except Exception:
            await stack.aclose()
            raise

    async def call_user_tool(self, user_id: str, server: str, tool: str, args: dict[str, Any], custom_env: dict[str, str]) -> dict[str, Any]:
        """Call a tool on a user-specific dynamic MCP server."""
        try:
            s = await self.connect_user(user_id, server, custom_env)
        except Exception as e:
            logger.error("mcp_user_connect_failed", user_id=user_id, server=server, tool=tool, error=str(e))
            raise ValueError(f"MCP server '{server}' is not available for user: {e}") from e

        try:
            result = await s.call_tool(tool, arguments=args)
            return {"content": result.content, "is_error": result.isError}
        except Exception as e:
            logger.error("mcp_user_tool_call_failed", user_id=user_id, server=server, tool=tool, error=str(e))
            raise ValueError(f"MCP tool '{tool}' failed on server '{server}': {e}") from e

    async def close_user_sessions(self, user_id: str) -> None:
        """Close and clean up all active MCP sessions for a specific user."""
        keys_to_remove = [k for k in self._user_sessions.keys() if k[0] == user_id]
        for key in keys_to_remove:
            try:
                await self.close_user_session(key)
                self._user_servers.pop(key, None)
            except Exception as e:
                logger.warning("mcp_user_session_close_failed", user_id=user_id, server=key[1], error=str(e))

    async def close_session(self, name: str) -> None:
        """Close a cached global MCP session and its transport context."""
        self._sessions.pop(name, None)
        stack = self._session_stacks.pop(name, None)
        if stack:
            await stack.aclose()

    async def close_user_session(self, session_key: tuple[str, str]) -> None:
        """Close a cached user MCP session and its transport context."""
        self._user_sessions.pop(session_key, None)
        stack = self._user_session_stacks.pop(session_key, None)
        if stack:
            await stack.aclose()


# ── Default global registry ─────────────────────────────────────────────

registry = MCPRegistry()