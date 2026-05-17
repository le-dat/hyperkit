# ai-server/db/models.py
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
from uuid import uuid4

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
AsyncSessionLocal = None


def init_db(database_url: str):
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
    tokens_used = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=_utcnow)