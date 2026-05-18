"""MCP server registry — connect, health-check, tool discovery, and tool calling."""

import os
import structlog
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.sse import sse_client


logger = structlog.get_logger(__name__)

WORKSPACE_DIR = "/tmp/agent-workspace"


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

        if cfg.transport == "stdio":
            if not cfg.command:
                raise ValueError(f"stdio transport for {name} requires command list")
            params = StdioServerParameters(command=cfg.command[0], args=cfg.command[1:])
            read, write = await stdio_client(params).__aenter__()
        elif cfg.transport == "http":
            if not cfg.url:
                raise ValueError(f"http transport for {name} requires url")
            read, write = await sse_client(cfg.url).__aenter__()
        else:
            raise ValueError(f"Unknown transport: {cfg.transport}")

        session = ClientSession(read, write)
        await session.initialize()
        self._sessions[name] = session

        # Discover available tools
        result = await session.list_tools()
        cfg.tools = [t.model_dump() for t in result.tools]
        cfg.is_healthy = True
        cfg.last_check = datetime.utcnow()

        logger.info("mcp_server_connected", name=name, num_tools=len(cfg.tools))
        return session

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
                await self._sessions[name].close()
                del self._sessions[name]
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


# ── Default global registry ─────────────────────────────────────────────

registry = MCPRegistry()

# Ensure workspace directory exists
os.makedirs(WORKSPACE_DIR, exist_ok=True)

registry.register(MCPServer(
    name="web_search",
    transport="stdio",
    command=["npx", "-y", "@modelcontextprotocol/server-brave-search"],
))
registry.register(MCPServer(
    name="filesystem",
    transport="stdio",
    command=["npx", "-y", "@modelcontextprotocol/server-filesystem", WORKSPACE_DIR],
))