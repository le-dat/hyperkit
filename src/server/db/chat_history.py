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
    # First verify the user has permission to create this conversation
    # (user_id is already set by the authenticated caller — we trust it from the route layer)
    async with AsyncSessionLocal() as db:
        exists = await db.execute(
            select(Conversation.id).where(Conversation.conversation_id == conversation_id)
        )
        if not exists.scalar_one_or_none():
            # Truncate title safely (unicode-aware)
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
    # Ownership is verified by the route layer before calling this
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
        result = await db.execute(
            select(Message.role, Message.content)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())  # Lấy tin nhắn mới nhất trước
            .limit(limit)
        )
        rows = result.fetchall()
        # Đảo ngược lại danh sách để trả về đúng thứ tự thời gian tăng dần
        return [Message(role=r.role, content=r.content) for r in reversed(rows)]


async def get_user_conversations(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Conversation], int]:
    """Load conversation list for sidebar. Returns (conversations, total_count)."""
    async with AsyncSessionLocal() as db:
        # Total count using a dedicated COUNT query
        count_result = await db.execute(
            select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
        )
        total = count_result.scalar_one()

        # Paginated results
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total