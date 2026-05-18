# Step 01 — FastAPI Core: App Factory + Config + DB Models

## Goal

FastAPI application with:
- Lifespan management (Redis pool, DB engine startup/shutdown)
- Pydantic settings config (all env vars in one place)
- SQLAlchemy async models for chat history
- CORS middleware
- Health state cached in `app.state` (no redundant DB queries on `/health`)
- `ENV=development` → console-rendered logs; production → JSON logs
- `X-Request-ID` response header for client-side log correlation
- Custom exceptions as `HTTPException` subclasses (structured 503 responses)

> **Prerequisite**: [Step 00 — Infrastructure](../00-infrastructure/01-infrastructure.md)

---

## File Structure

```
ai-server/
├── main.py            ← App factory + lifespan
├── config.py          ← Pydantic BaseSettings
├── core/
│   └── exceptions.py  ← Custom exceptions
├── middleware/
│   └── logging.py     ← Structured logging middleware
├── routers/
│   └── system.py      ← Health check & system routes
├── auth/
│   └── clerk.py       ← Clerk JWT verify dependency
└── db/
    ├── models.py       ← SQLAlchemy ORM models
    └── chat_history.py ← CRUD helpers
```

---

## Step 1.1 — Install

```bash
cd backend
pip install fastapi "uvicorn[standard]" sse-starlette \
  redis arq "sqlalchemy[asyncio]" asyncpg \
  httpx pydantic-settings python-dotenv \
  tenacity pybreaker langchain-openai langchain-anthropic \
  langgraph langsmith structlog prometheus-client mcp \
  "pyjwt[crypto]" cryptography
```

---

## Step 1.2 — config.py

```python
# ai-server/config.py
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth (Clerk)
    clerk_frontend_api: str = ""  # e.g. "your-app.clerk.accounts.dev"
    clerk_secret_key: str = ""  # for audit signing
    clerk_issuer_url: str = ""   # e.g. "https://clerk.your-domain.com"
    clerk_audience: str = ""  # Usually your Clerk frontend API URL

    # Database (chat_db) — supports DATABASE_URL or CHAT_DATABASE_URL
    database_url: str = Field(
        "",
        validation_alias=AliasChoices("DATABASE_URL", "CHAT_DATABASE_URL")
    )

    # Redis
    redis_url: str = "redis://localhost:6379"

    # LLM
    llm_provider: str = "openai"  # "openai" | "anthropic" | "local"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    vllm_base_url: str = "http://localhost:8080/v1"

    # Guardrails
    max_cost_per_request_usd: float = 5.0
    max_tool_calls_per_session: int = 15

    # LangSmith
    langchain_tracing_v2: bool = True
    langchain_api_key: str = ""
    langchain_project: str = "ai-chatbot-prod"

    # Slack alerts
    slack_webhook_url: str = ""

    # CORS
    frontend_url: str = ""  # must be set — app fails fast if omitted

    # App
    max_conversations_limit: int = 50

    # Database pool settings (configurable)
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
```

---

## Step 1.3 — db/models.py

```python
# ai-server/db/models.py
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
from uuid import uuid4

Base = declarative_base()


def create_engine_and_session(
    database_url: str,
    pool_size: int = 10,
    max_overflow: int = 20,
    pool_timeout: int = 30,
):
    """Create engine and session factory. Pool params are configurable."""
    engine = create_async_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        connect_args={"timeout": 10},
    )
    return engine, sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# Module-level globals — set by init_db() at startup (not at import time)
engine = None
AsyncSessionLocal = None


def init_db(database_url: str):
    """Initialize DB engine and session factory. Called once from main.py lifespan."""
    global engine, AsyncSessionLocal
    from config import settings
    engine, AsyncSessionLocal = create_engine_and_session(
        database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )


def _utcnow():
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id         = Column(String(100), nullable=False, index=True)
    title           = Column(String(255), default="New conversation")
    created_at      = Column(DateTime(timezone=True), default=_utcnow)
    updated_at      = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_conversations_user_updated", "user_id", "updated_at"),
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_messages_role"),
    )

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(String(100), nullable=False, index=True)
    role            = Column(String(20), nullable=False)
    content         = Column(Text, nullable=False)
    tokens_used     = Column(Integer, default=0)
    cost_usd        = Column(Float, default=0.0)
    created_at      = Column(DateTime(timezone=True), default=_utcnow)
```

---

## Step 1.4 — db/chat_history.py

```python
# ai-server/db/chat_history.py
from sqlalchemy import select, func
from db.models import AsyncSessionLocal, Conversation, Message


async def _verify_ownership(conversation_id: str, user_id: str) -> bool:
    """Check that a conversation belongs to the given user."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Conversation.id).where(
                Conversation.conversation_id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        return result.scalar_one_or_none() is not None


async def ensure_conversation(conversation_id: str, user_id: str, first_message: str = "") -> None:
    """Create a new conversation if it doesn't exist. Truncates title at 80 chars."""
    async with AsyncSessionLocal() as db:
        exists = await db.execute(
            select(Conversation.id).where(Conversation.conversation_id == conversation_id)
        )
        if not exists.scalar_one_or_none():
            title = first_message[:80] if first_message else "New conversation"
            db.add(Conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                title=title,
            ))
            await db.commit()


async def save_message(
    conversation_id: str, user_id: str, role: str, content: str,
    tokens_used: int = 0, cost_usd: float = 0.0,
) -> None:
    """Save a message to the conversation."""
    async with AsyncSessionLocal() as db:
        db.add(Message(
            conversation_id=conversation_id,
            role=role, content=content,
            tokens_used=tokens_used, cost_usd=cost_usd,
        ))
        await db.commit()


async def get_conversation_messages(
    conversation_id: str, user_id: str, limit: int = 5
) -> list[Message]:
    """Load last N messages for working memory (Tier 1). Verifies ownership."""
    if not await _verify_ownership(conversation_id, user_id):
        return []
    async with AsyncSessionLocal() as db:
        # Project only role + content columns (not all Message columns)
        result = await db.execute(
            select(Message.role, Message.content)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        rows = result.fetchall()
        return [Message(role=r.role, content=r.content) for r in rows]


async def get_user_conversations(
    user_id: str, limit: int = 50, offset: int = 0,
) -> tuple[list[Conversation], int]:
    """Load conversation list for sidebar. Returns (conversations, total_count)."""
    async with AsyncSessionLocal() as db:
        count_result = await db.execute(
            select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
        )
        total = count_result.scalar_one()

        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total
```

---

## Step 1.5 — main.py

```python
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

    structlog.get_logger().info("startup_complete", service="ai-chatbot-backend")
    yield

    # Shutdown: close all Redis pools and dispose DB engine
    from db.models import engine as db_engine
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

# Future Routers (not yet implemented)
# from routers import agent, sse, history, mcp
# app.include_router(agent.router, prefix="/agent", tags=["agent"])
# app.include_router(sse.router, prefix="/sse", tags=["sse"])
# app.include_router(history.router, prefix="/history", tags=["history"])
# app.include_router(mcp.router, prefix="/mcp", tags=["mcp"])
```

### Step 1.5b — core/exceptions.py

```python
# ai-server/core/exceptions.py
from fastapi import HTTPException


class RedisConnectionError(HTTPException):
    """Raised when connection to Redis fails during startup or operation."""

    def __init__(self, detail: str = "Redis connection failed"):
        super().__init__(status_code=503, detail=detail)


class DBConnectionError(HTTPException):
    """Raised when connection to the Database fails during startup or operation."""

    def __init__(self, detail: str = "Database connection failed"):
        super().__init__(status_code=503, detail=detail)
```

> Custom exceptions extend `HTTPException` so FastAPI returns structured JSON
> `{ "detail": "..." }` with `503` status instead of a generic 500 with stack trace.

---

## Step 1.6 — .env (backend)

```env
# ai-server/.env
CLERK_FRONTEND_API=your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER_URL=https://your-domain.clerk.accounts.com
CLERK_AUDIENCE=https://your-app.clerk.accounts.dev

DATABASE_URL=postgresql+asyncpg://chatbot:<password>@localhost:5432/chat_db
REDIS_URL=redis://:redis_pass@localhost:6379/0

# Database pool settings (optional — defaults shown)
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30

LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=ai-chatbot-prod

MAX_COST_PER_REQUEST_USD=5.0
MAX_TOOL_CALLS_PER_SESSION=15
```

---

## Step 1.7 — Start & Test

```bash
cd backend
uvicorn main:app --reload --port 8000

# Health check
curl http://localhost:8000/health
# → {"status":"ok","redis":true,"database":true}

### Step 1.7b — Health endpoint uses startup state

The `/health` endpoint in `routers/system.py` reads cached health state set during startup — it does **not** run a new `SELECT 1` on every call:

```python
@router.get("/health")
async def health(request: Request):
    redis_ok = getattr(request.app.state, "redis_ready", False)
    db_ok = getattr(request.app.state, "db_ready", False)

    # Light Redis re-check (ping the fast-fail pool to avoid blocking)
    if redis_ok:
        try:
            await request.app.state.redis_cache.ping()
        except Exception:
            redis_ok = False

    status = "ok" if (redis_ok and db_ok) else "degraded"
    return {"status": status, "redis": redis_ok, "database": db_ok}
```

## Verification Checklist

- [ ] FastAPI starts on port 8000 with no import errors
- [ ] `GET /health` returns `{"status":"ok","redis":true,"database":true}`
- [ ] `chat_db` contains `conversations` and `messages` tables
- [ ] Redis connection successful (ping returns true)
- [ ] `ENV=development` in docker-compose override → console-rendered logs (human-readable)
- [ ] `ENV=production` → JSON logs (for log aggregation)

> ➡️ Next: [Step 02 — Backend Auth](./02-auth.md)
