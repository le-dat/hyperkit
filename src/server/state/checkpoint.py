"""Checkpointer factory: PostgresSaver (prod) with InMemorySaver (dev/testing).

Dev mode uses InMemorySaver because AsyncSqliteSaver requires a persistent
asyncio event loop that must live for the process duration (aiosqlite spawns
a background thread per connection that needs an active event loop).

For production, PostgresSaver is used (sync API, long-lived psycopg connections).

The checkpointer is lazily initialized on first access so ENV is read at
runtime (not import time), avoiding the issue of env vars not being set when
the module is first imported.
"""

import os
import structlog

from config import settings

logger = structlog.get_logger(__name__)


def _is_production() -> bool:
    """Check ENV at call time (not module load time)."""
    return os.getenv("ENV") in ("production", "prod")


def get_is_prod() -> bool:
    """Public accessor so other modules can check without re-reading env."""
    return _is_production()

# Cached instances — created once and reused.
_postgres_checkpointer = None
_postgres_context = None
_in_memory_checkpointer = None


def _warn_inmemory():
    """Log a warning when InMemorySaver is used (state lost on restart)."""
    logger.warning(
        "checkpoint_using_inmemory_warning",
        message="InMemorySaver is active. All checkpoint state will be lost on restart. Set ENV=production to use PostgresSaver.",
    )


def get_checkpointer():
    """
    Return the resolved checkpointer, initializing it on first call.

    Lazy initialization ensures env vars are read at request time, not at
    module import time. This allows settings to be loaded before the first
    use (e.g., from main.py lifespan).
    """
    global _postgres_checkpointer, _postgres_context, _in_memory_checkpointer

    if _is_production():
        if _postgres_checkpointer is not None:
            return _postgres_checkpointer

        from langgraph.checkpoint.postgres import PostgresSaver

        # Use settings.database_url via Pydantic (supports .env and various aliases)
        database_url = settings.database_url
        if not database_url:
            raise ValueError(
                "DATABASE_URL or CHAT_DATABASE_URL must be set in production"
            )

        # PostgresSaver.from_conn_string uses psycopg, not asyncpg.
        # Strip asyncpg prefix if present so we get a valid conninfo string.
        if database_url.startswith("postgresql+asyncpg://"):
            database_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)

        # PostgresSaver.from_conn_string is a context manager;
        # call __enter__() to get the actual saver instance
        _postgres_context = PostgresSaver.from_conn_string(database_url)
        saver = _postgres_context.__enter__()
        saver.setup()
        _postgres_checkpointer = saver
        return saver
    else:
        if _in_memory_checkpointer is not None:
            return _in_memory_checkpointer

        from langgraph.checkpoint.memory import InMemorySaver

        _warn_inmemory()
        _in_memory_checkpointer = InMemorySaver()
        return _in_memory_checkpointer


# Module-level lazy checkpointer — initialized on first access.
# LangGraph stores this on the compiled graph; it is not accessed until
# first ainvoke() call, by which time settings are already loaded.
checkpointer = get_checkpointer()


def cleanup_checkpointer():
    """Close active PostgresSaver connection pools on shutdown."""
    global _postgres_context, _postgres_checkpointer
    if _postgres_context is not None:
        _postgres_context.__exit__(None, None, None)
        _postgres_context = None
        _postgres_checkpointer = None