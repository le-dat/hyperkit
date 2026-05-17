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
# Only enable tracing when an API key is actually provided
if settings.langchain_tracing_v2 and settings.langchain_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
else:
    os.environ["LANGCHAIN_TRACING_V2"] = "false"

# Configure structlog — use console renderer in development for human-readable output
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
    # ── Startup ─────────────────────────────────────────────────────────
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

    # Redis
    try:
        app.state.redis = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        await app.state.redis.ping()
        app.state.redis_ready = True
    except Exception as e:
        structlog.get_logger().error("redis_startup_failed", error=str(e))
        raise RedisConnectionError(f"Redis connection failed: {e}")

    structlog.get_logger().info("startup_complete", service="ai-chatbot-backend")
    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    from db.models import engine as db_engine
    await app.state.redis.close()
    await db_engine.dispose()
    structlog.get_logger().info("shutdown_complete", service="ai-chatbot-backend")


app = FastAPI(
    title="AI Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware
# CORS: require frontend_url in all environments — no wildcard fallback with credentials
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

# Future Routers (placeholders)
# from routers import agent, sse, history, mcp
# app.include_router(agent.router, prefix="/agent", tags=["agent"])
# app.include_router(sse.router, prefix="/sse", tags=["sse"])
# app.include_router(history.router, prefix="/history", tags=["history"])
# app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])