# ai-server/main.py
import os
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.models import init_db
from middleware.logging import log_requests
from routers import system
from core.exceptions import RedisConnectionError, DBConnectionError

# Set LangSmith tracing env vars before importing LangChain
if settings.langchain_tracing_v2 and settings.langchain_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
else:
    os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Configure structlog — console renderer in development, JSON in production
is_development = os.getenv("ENV") == "development"
_processors = [
    structlog.contextvars.merge_contextvars,
    structlog.processors.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
]
if is_development:
    _processors.append(structlog.dev.ConsoleRenderer())
else:
    _processors.append(structlog.processors.JSONRenderer())
structlog.configure(processors=_processors)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB and Redis pools, cache health state on app.state
    from config import settings
    import redis.asyncio as aioredis

    init_db(settings.database_url)
    from db.models import engine
    app.state.db_ready = False
    app.state.redis_ready = False

    # Verify DB connection
    try:
        async with engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        app.state.db_ready = True
    except Exception as e:
        structlog.get_logger().error("db_startup_failed", error=str(e))
        raise DBConnectionError(f"Database connection failed: {e}")

    # Verify and initialize 3 Isolated Redis Connection Pools
    try:
        # Pool 1: redis_stream (Async pool for long-running SSE streams & Pub/Sub)
        app.state.redis_stream = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=300,  # Long timeout allowed for streaming active connections
            max_connections=50,
        )
        
        # Pool 2: redis_worker (Isolated pool for background worker tasks communication)
        app.state.redis_worker = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=10,
            max_connections=20,
        )
        
        # Pool 3: redis_cache (Fast-fail Cache Pool - with ultra-strict short timeouts)
        app.state.redis_cache = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,    # Fast-fail: 1s max waiting time to protect latency
            max_connections=30,
        )

        # For backward compatibility, assign redis_stream to redis
        app.state.redis = app.state.redis_stream

        # Ping to verify basic connection
        await app.state.redis_cache.ping()
        app.state.redis_ready = True
    except Exception as e:
        structlog.get_logger().error("redis_pools_startup_failed", error=str(e))
        raise RedisConnectionError(f"Redis connection pools failed: {e}")

    # Initialize cached ARQ pool for agent task enqueueing
    from arq import create_pool
    from arq.connections import RedisSettings
    from urllib.parse import urlparse

    parsed = urlparse(settings.redis_url)
    app.state.arq_pool = await create_pool(RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
    ))

    # Build and cache MCP tools so the sync LangGraph node can use them
    from agents.supervisor import build_mcp_tools, set_mcp_tools
    try:
        mcp_tools = await build_mcp_tools()
        set_mcp_tools(mcp_tools)
        structlog.get_logger().info("mcp_tools_loaded", count=len(mcp_tools))
    except Exception as e:
        structlog.get_logger().warning("mcp_tools_init_failed", error=str(e))

    structlog.get_logger().info("startup_complete", service="ai-chatbot-backend")
    yield

    # Shutdown: close all Redis pools and dispose DB engine
    from db.models import engine as db_engine
    from state.checkpoint import cleanup_checkpointer
    cleanup_checkpointer()
    await app.state.arq_pool.close()
    await app.state.redis_stream.close()
    await app.state.redis_worker.close()
    await app.state.redis_cache.close()
    await db_engine.dispose()
    structlog.get_logger().info("shutdown_complete", service="ai-chatbot-backend")


app = FastAPI(
    title="AI Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware — fail fast if frontend_url is missing
if not settings.frontend_url:
    raise ValueError("frontend_url must be set — CORS cannot use a wildcard origin with credentials")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.middleware("http")(log_requests)

# Routers
app.include_router(system.router, tags=["system"])
from routers import agent  # noqa: F401
from routers import sse  # noqa: F401
from routers import history  # noqa: F401
from routers import mcp  # noqa: F401
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(sse.router, prefix="/sse", tags=["sse"])
app.include_router(history.router, prefix="/history", tags=["history"])
app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])