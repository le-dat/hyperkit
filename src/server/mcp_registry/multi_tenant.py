"""Multi-tenant MCP server registry logic — manages dynamic user-specific server instances and sessions."""

import os
import structlog
from contextlib import AsyncExitStack
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp_registry.catalog import MCP_CATALOG
from mcp_registry.types import MCPServer
from mcp_registry.base import BaseRegistry
from db.utils import _utcnow

logger = structlog.get_logger(__name__)

WORKSPACE_DIR = os.getenv("MCP_WORKSPACE_DIR", "/tmp/agent-workspace")


class MultiTenantRegistry(BaseRegistry):
    """Registry extension handling dynamic, user-specific (multi-tenant) MCP server instances."""

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
                last_check=_utcnow()
            )

            logger.info("mcp_user_server_connected", user_id=user_id, name=name, num_tools=len(tools_list))
            return session
        except Exception:
            await stack.aclose()
            raise

    async def call_user_tool(
        self,
        user_id: str,
        server: str,
        tool: str,
        args: dict[str, Any],
        custom_env: dict[str, str],
    ) -> dict[str, Any]:
        """Call a tool on a user-specific dynamic MCP server."""
        try:
            s = await self.connect_user(user_id, server, custom_env)
        except Exception as e:
            logger.error("mcp_user_connect_failed", user_id=user_id, server=server, tool=tool, error=str(e))
            raise ValueError(f"MCP server '{server}' is not available for user: {e}") from e

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

    async def close_user_session(self, session_key: tuple[str, str]) -> None:
        """Close a cached user MCP session and its transport context."""
        self._user_sessions.pop(session_key, None)
        stack = self._user_session_stacks.pop(session_key, None)
        if stack:
            await stack.aclose()

    async def close_all_sessions(self) -> None:
        """Close all global and user MCP sessions and their transport contexts."""
        # Close global sessions
        for name in list(self._sessions.keys()):
            await self.close_session(name)
        # Close user sessions
        for key in list(self._user_sessions.keys()):
            await self.close_user_session(key)
        # Clear server caches
        self._servers.clear()
        self._user_servers.clear()
