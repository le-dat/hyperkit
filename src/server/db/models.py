# ai-server/db/models.py
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, CheckConstraint, Index, text, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from uuid import uuid4

import sys
from pathlib import Path

# Resolve server/ path so db.utils can be imported
_server_path = str(Path(__file__).resolve().parents[1])
if _server_path not in sys.path:
    sys.path.insert(0, _server_path)

from db.utils import _utcnow

Base = declarative_base()


def create_engine_and_session(database_url: str, pool_size: int = 10, max_overflow: int = 20, pool_timeout: int = 30):
    """Create engine and session factory. Called once at startup."""
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


# These are set by init_db() called from main.py lifespan
engine = None
_session_factory = None


def AsyncSessionLocal(*args, **kwargs):
    if _session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _session_factory(*args, **kwargs)


async def init_db(database_url: str):
    global engine, _session_factory
    from config import settings
    engine, _session_factory = create_engine_and_session(
        database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )
    # Auto-create all tables on startup (idempotent - uses IF NOT EXISTS)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure 'thoughts' column exists for incremental migration
        await conn.execute(text("ALTER TABLE messages ADD COLUMN IF NOT EXISTS thoughts TEXT;"))


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    title = Column(String(255), default="New conversation")
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        Index("ix_conversations_user_updated", "user_id", "updated_at"),
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name="ck_messages_role"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(String(100), nullable=False, index=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    thoughts = Column(Text, nullable=True)
    tokens_used = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class UserMcpConfig(Base):
    __tablename__ = "user_mcp_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(String(100), nullable=False, index=True)
    server_name = Column(String(50), nullable=False)
    enabled = Column(Boolean, default=False, nullable=False)
    encrypted_secret = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "server_name", name="uq_user_mcp_server"),
        Index("ix_user_mcp_lookup", "user_id", "server_name"),
    )