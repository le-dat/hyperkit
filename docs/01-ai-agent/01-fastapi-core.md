# Step 01 — FastAPI Core: App Factory + Config + DB Models

## Goal

FastAPI application with:
- Lifespan management (Redis pool, DB engine startup/shutdown)
- Pydantic settings config (all env vars in one place)
- SQLAlchemy async models for chat history
- CORS middleware

> **Prerequisite**: [Step 00 — Infrastructure](../00-infrastructure/01-infrastructure.md)

---

## File Structure

```
backend/
├── main.py            ← App factory + lifespan
├── config.py          ← Pydantic BaseSettings
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
  python-jose[cryptography]
```

---

## Step 1.2 — config.py

```python
# backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Auth (Clerk)
    clerk_frontend_api: str = ""       # e.g. "your-app.clerk.accounts.dev"
    clerk_secret_key: str = ""         # for audit signing

    # Database (chat_db)
    database_url: str = "postgresql+asyncpg://chatbot:chatbot_pass@localhost:5432/chat_db"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # LLM
    llm_provider: str = "openai"          # "openai" | "anthropic" | "local"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    vllm_base_url: str = "http://localhost:8080/v1"   # on-premise

    # Guardrails
    max_cost_per_request_usd: float = 5.0
    max_tool_calls_per_session: int = 15

    # LangSmith
    langchain_tracing_v2: str = "true"
    langchain_api_key: str = ""
    langchain_project: str = "ai-chatbot-prod"

    # Slack alerts
    slack_webhook_url: str = ""

    # CORS
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
```

---

## Step 1.3 — db/models.py

```python
# backend/db/models.py
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from uuid import uuid4

from config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class Conversation(Base):
    __tablename__ = "conversations"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id         = Column(String(100), nullable=False, index=True)
    title           = Column(String(255), default="New conversation")
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


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
    created_at      = Column(DateTime, default=datetime.utcnow)
```

---

## Step 1.4 — db/chat_history.py

```python
# backend/db/chat_history.py
from sqlalchemy import select
from db.models import AsyncSessionLocal, Conversation, Message


async def ensure_conversation(conversation_id: str, user_id: str, first_message: str = "") -> None:
    async with AsyncSessionLocal() as db:
        exists = await db.execute(
            select(Conversation.id).where(Conversation.conversation_id == conversation_id)
        )
        if not exists.scalar_one_or_none():
            db.add(Conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                title=(first_message[:80] or "New conversation"),
            ))
            await db.commit()


async def save_message(
    conversation_id: str, user_id: str, role: str, content: str,
    tokens_used: int = 0, cost_usd: float = 0.0,
) -> None:
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
    """Load last N messages for working memory (Tier 1)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return result.scalars().all()


async def get_user_conversations(user_id: str) -> list[Conversation]:
    """Load conversation list for sidebar."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(50)
        )
        return result.scalars().all()
```

---

## Step 1.5 — main.py

```python
# backend/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis

from config import settings
from db.models import Base, engine

# Set LangSmith tracing env vars before importing LangChain
os.environ["LANGCHAIN_TRACING_V2"] = settings.langchain_tracing_v2
os.environ["LANGCHAIN_API_KEY"]     = settings.langchain_api_key
os.environ["LANGCHAIN_PROJECT"]     = settings.langchain_project


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ─────────────────────────────────────────────────────────
    # Redis
    app.state.redis = await aioredis.from_url(settings.redis_url, decode_responses=True)
    # DB: create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────
    await app.state.redis.close()
    await engine.dispose()


app = FastAPI(title="AI Chatbot Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — added in later steps
# from routers import agent, sse, history, mcp
# app.include_router(agent.router)
# app.include_router(sse.router)
# app.include_router(history.router)
# app.include_router(mcp.router)

@app.get("/health")
async def health(request: "Request"):
    redis_ok = await request.app.state.redis.ping()
    return {"status": "ok", "redis": redis_ok}
```

---

## Step 1.6 — .env (backend)

```env
# backend/.env
CLERK_FRONTEND_API=your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql+asyncpg://chatbot:chatbot_pass@localhost:5432/chat_db
REDIS_URL=redis://localhost:6379

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
# → {"status":"ok","redis":true}

# Check DB tables created
psql -h localhost -U chatbot -d chat_db -c "\dt"
# → conversations, messages
```

## Verification Checklist

- [ ] FastAPI starts on port 8000 with no import errors
- [ ] `GET /health` returns `{"status":"ok","redis":true}`
- [ ] `chat_db` contains `conversations` and `messages` tables
- [ ] Redis connection successful (ping returns true)

> ➡️ Next: [Step 02 — Backend Auth](./02-auth.md)
