# ai-server/db/chat_history.py
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