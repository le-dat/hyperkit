"""Base MCP server registry logic — manages system-level servers, catalog registration, connections, and health."""

import os
import structlog
from contextlib import AsyncExitStack
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.sse import sse_client
from mcp_registry.catalog import MCP_CATALOG, MCPAuthType
from mcp_registry.types import MCPServer
from db.utils import _utcnow

logger = structlog.get_logger(__name__)


class BaseRegistry:
    """Registry engine for system-level MCP server connections and health monitoring."""

    def __init__(self):
        self._servers: dict[str, MCPServer] = {}
        self._sessions: dict[str, ClientSession] = {}
        self._session_stacks: dict[str, AsyncExitStack] = {}
        self._user_servers: dict[tuple[str, str], MCPServer] = {}
        self._user_sessions: dict[tuple[str, str], ClientSession] = {}
        self._user_session_stacks: dict[tuple[str, str], AsyncExitStack] = {}

    def register(self, server: MCPServer) -> None:
        self._servers[server.name] = server
        logger.info("mcp_server_registered", name=server.name, transport=server.transport)

    async def _auto_register_from_catalog(self, name: str) -> None:
        """Automatically register a server from MCP_CATALOG if it exists and is public."""
        if name not in MCP_CATALOG:
            raise ValueError(f"MCP server '{name}' not found in catalog for auto-registration")
        catalog_item = MCP_CATALOG[name]
        if catalog_item.auth_type != MCPAuthType.PUBLIC:
            raise ValueError(f"MCP server '{name}' requires authentication and cannot be auto-registered")
        server = MCPServer(
            name=catalog_item.name,
            transport="stdio",
            command=catalog_item.command,
            enabled=True,
            tools=[],
            is_healthy=False,
            last_check=None,
        )
        self.register(server)
        logger.info("mcp_auto_registered", name=name)

    async def connect(self, name: str) -> ClientSession:
        """Connect to a registered MCP server, caching the session."""
        if name in self._sessions:
            existing = self._sessions[name]
            try:
                if hasattr(existing, "_read_stream") and not existing._read_stream.is_closed:
                    return existing
            except Exception:
                pass  # Fall through to reconnect

        if name not in self._servers:
            await self._auto_register_from_catalog(name)
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
            cfg.last_check = _utcnow()

            logger.info("mcp_server_connected", name=name, num_tools=len(cfg.tools))
            return session
        except Exception:
            await stack.aclose()
            raise

    async def call_tool(self, server: str, tool: str, args: dict[str, Any]) -> dict[str, Any]:
        """Call a tool on a connected MCP server."""
        try:
            if server not in self._servers:
                await self._auto_register_from_catalog(server)
            s = await self.connect(server)
        except Exception as e:
            logger.error("mcp_connect_failed", server=server, tool=tool, error=str(e))
            raise ValueError(f"MCP server '{server}' is not available: {e}") from e

        try:
            result = await s.call_tool(tool, arguments=args)
            content = getattr(result, "content", None)
            if content is None:
                logger.warning(
                    "mcp_tool_returned_no_content",
                    server=server,
                    tool=tool,
                    detail="MCP tool returned a result without 'content'",
                )
                content = ""
            return {"content": content, "is_error": result.isError}
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

    async def check_health(self, name: str) -> bool:
        """Ping a server by refreshing its session."""
        try:
            cfg = self._servers[name]
            if name in self._sessions:
                await self.close_session(name)
            await self.connect(name)
            cfg.is_healthy = True
            cfg.last_check = _utcnow()
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

    async def close_session(self, name: str) -> None:
        """Close a cached global MCP session and its transport context."""
        self._sessions.pop(name, None)
        stack = self._session_stacks.pop(name, None)
        if stack:
            await stack.aclose()
