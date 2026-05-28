"""MCP tool cache for per-user dynamic MCP servers.

Caches UserMcpConfig lookups and decrypted sessions for 60 seconds to avoid
hitting the database on every node_process invocation.
"""

from datetime import datetime, timezone, timedelta
from langchain_core.tools import StructuredTool

# TTL cache: (user_id, server_name) -> (timestamp, tools_list)
_user_tools_cache: dict[tuple[str, str], tuple[datetime, list["StructuredTool"]]] = {}
_CACHE_TTL_SECONDS = 60


def _cache_key(user_id: str, server_name: str) -> tuple[str, str]:
    return (user_id, server_name)


def _is_expired(entry: tuple[datetime, list["StructuredTool"]]) -> bool:
    return (datetime.now(timezone.utc) - entry[0]) > timedelta(seconds=_CACHE_TTL_SECONDS)


async def get_user_mcp_tools(user_id: str) -> list["StructuredTool"]:
    """Retrieve and build user-specific dynamic MCP tools with TTL caching."""
    from db.models import AsyncSessionLocal, UserMcpConfig
    from mcp_registry.crypto import decrypt_key
    from mcp_registry.registry import registry
    from sqlalchemy import select

    result: list["StructuredTool"] = []

    async with AsyncSessionLocal() as db_session:
        db_result = await db_session.execute(
            select(UserMcpConfig).filter_by(user_id=user_id, enabled=True)
        )
        rows = db_result.scalars().all()

    for row in rows:
        cache_key = _cache_key(user_id, row.server_name)

        # Check cache first
        if cache_key in _user_tools_cache:
            entry = _user_tools_cache[cache_key]
            if not _is_expired(entry):
                result.extend(entry[1])
                continue
            else:
                del _user_tools_cache[cache_key]

        # Build tools for this server
        tools = await _build_user_server_tools(user_id, row)
        if tools:
            _user_tools_cache[cache_key] = (datetime.now(timezone.utc), tools)
            result.extend(tools)

    return result


async def _build_user_server_tools(user_id: str, row) -> list["StructuredTool"]:
    """Connect to a user MCP server and build its StructuredTool list."""
    import structlog

    logger = structlog.get_logger(__name__)
    from mcp_registry.registry import registry

    custom_env = {}
    if row.encrypted_secret:
        try:
            decrypted = decrypt_key(row.encrypted_secret)
            env_map = {
                "postgres": "PG_CONNECTION_STRING",
                "github": "GITHUB_PERSONAL_ACCESS_TOKEN",
                "google_maps": "GOOGLE_MAPS_API_KEY",
                "slack": "SLACK_BOT_TOKEN",
                "web_search": "BRAVE_API_KEY",
            }
            key_name = env_map.get(row.server_name)
            if key_name:
                custom_env[key_name] = decrypted
        except Exception as e:
            logger.warning(
                "mcp_user_key_decrypt_failed",
                user_id=user_id,
                server=row.server_name,
                error=str(e),
            )
            return []

    server_tools: list["StructuredTool"] = []
    try:
        session = await registry.connect_user(user_id, row.server_name, custom_env)
        server_key = (user_id, row.server_name)
        server_cfg = registry._user_servers[server_key]

        for td in server_cfg.tools:
            server_name = row.server_name
            name = td["name"]
            description = td.get("description", "")

            # Capture variables via default args to avoid late-binding closure bug
            async def call(
                server_: str = server_name,
                name_: str = name,
                env_: dict = custom_env,
                **kwargs,
            ) -> str:
                r = await registry.call_user_tool(user_id, server_, name_, kwargs, env_)
                content = r.get("content", "")
                if r.get("is_error"):
                    raise RuntimeError(f"MCP tool error: {content}")
                return content

            server_tools.append(
                StructuredTool.from_function(
                    coroutine=call,
                    name=name,
                    description=description,
                )
            )
    except Exception as e:
        logger.warning(
            "mcp_user_server_connect_failed",
            user_id=user_id,
            server=row.server_name,
            error=str(e),
        )
        return []

    return server_tools


def invalidate_user_tools_cache(user_id: str) -> None:
    """Remove all cached tools for a user — call when toggling or deleting keys."""
    keys_to_remove = [k for k in _user_tools_cache if k[0] == user_id]
    for key in keys_to_remove:
        del _user_tools_cache[key]