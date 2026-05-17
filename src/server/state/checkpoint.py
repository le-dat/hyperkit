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
from config import settings

IS_PROD = os.getenv("ENV") == "production"

# Cached instances — created once and reused.
_postgres_checkpointer = None
_postgres_context = None
_in_memory_checkpointer = None


def get_checkpointer():
    """
    Return the resolved checkpointer, initializing it on first call.

    Lazy initialization ensures env vars are read at request time, not at
    module import time. This allows settings to be loaded before the first
    use (e.g., from main.py lifespan).
    """
    global _postgres_checkpointer, _postgres_context, _in_memory_checkpointer

    if IS_PROD:
        if _postgres_checkpointer is not None:
            return _postgres_checkpointer

        from langgraph.checkpoint.postgres import PostgresSaver

        # Sử dụng settings.database_url của Pydantic (hỗ trợ .env và các alias khác nhau)
        database_url = settings.database_url
        if not database_url:
            raise ValueError(
                "DATABASE_URL or CHAT_DATABASE_URL must be set in production"
            )
        
        # PostgresSaver.from_conn_string là một context manager, cần __enter__() để lấy saver thực tế
        _postgres_context = PostgresSaver.from_conn_string(database_url)
        saver = _postgres_context.__enter__()
        saver.setup()
        _postgres_checkpointer = saver
        return saver
    else:
        if _in_memory_checkpointer is not None:
            return _in_memory_checkpointer

        from langgraph.checkpoint.memory import InMemorySaver

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