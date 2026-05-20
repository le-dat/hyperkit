# ai-server/core/lifespan.py
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from urllib.parse import urlparse
from arq import create_pool
from arq.connections import RedisSettings

from config import settings
from db import models as db_models
from core.exceptions import DBConnectionError
from core.redis import init_redis_pools, close_redis_pools
from agents.supervisor import build_mcp_tools, set_mcp_tools
from state.checkpoint import cleanup_checkpointer

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ─── STARTUP PHASE ───
    # Startup: init DB and Redis pools, cache health state on app.state
    await db_models.init_db(settings.database_url)
    app.state.db_ready = False
    app.state.redis_ready = False

    # Verify DB connection
    try:
        async with db_models.engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        app.state.db_ready = True
    except Exception as e:
        logger.error("db_startup_failed", error=str(e))
        raise DBConnectionError(f"Database connection failed: {e}")

    # Verify and initialize 3 Isolated Redis Connection Pools
    await init_redis_pools(app)

    # Initialize cached ARQ pool for agent task enqueueing
    parsed = urlparse(settings.redis_url)
    app.state.arq_pool = await create_pool(RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    ))

    # Build and cache MCP tools so the sync LangGraph node can use them
    try:
        mcp_tools = await build_mcp_tools()
        set_mcp_tools(mcp_tools)
        logger.info("mcp_tools_loaded", count=len(mcp_tools))
    except Exception as e:
        logger.warning("mcp_tools_init_failed", error=str(e))

    logger.info("startup_complete", service="ai-chatbot-backend")
    yield

    # ─── SHUTDOWN PHASE ───
    # Shutdown: close all Redis pools and dispose DB engine
    cleanup_checkpointer()
    if hasattr(app.state, "arq_pool"):
        await app.state.arq_pool.close()
    await close_redis_pools(app)
    await db_models.engine.dispose()
    logger.info("shutdown_complete", service="ai-chatbot-backend")
