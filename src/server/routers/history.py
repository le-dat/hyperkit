"""History router — conversation list for sidebar + message replay."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from auth.clerk import get_current_user_dep
from db.chat_history import get_user_conversations, _verify_ownership
from db.models import AsyncSessionLocal, Message
from core.schemas import ApiResponseWithPagination, PaginationDetails


router = APIRouter(prefix="/history", tags=["history"])


class ConversationItem(BaseModel):
    conversation_id: str
    title: str
    updated_at: str


class MessageItem(BaseModel):
    role: str
    content: str
    tokens_used: int
    cost_usd: float
    created_at: str


@router.get("", response_model=ApiResponseWithPagination[list[ConversationItem]])
async def list_conversations(user: str = Depends(get_current_user_dep)):
    convs, _ = await get_user_conversations(user_id=user, limit=50, offset=0)
    data = [
        ConversationItem(
            conversation_id=c.conversation_id,
            title=c.title,
            updated_at=c.updated_at.isoformat(),
        )
        for c in convs
    ]
    return ApiResponseWithPagination(
        data=data,
        pagination=PaginationDetails(
            nextCursor=None,
            hasMore=False,
            limit=50
        )
    )


@router.get("/{conversation_id}", response_model=ApiResponseWithPagination[list[MessageItem]])
async def get_messages(
    conversation_id: str,
    user: str = Depends(get_current_user_dep),
):
    """
    Reload: all messages for a conversation (when user clicks sidebar item).
    Verifies ownership before returning any data.
    """
    if not await _verify_ownership(conversation_id, user):
        raise HTTPException(403, "Forbidden")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(100)
        )
        rows = result.scalars().all()

    data = [
        MessageItem(
            role=m.role,
            content=m.content,
            tokens_used=m.tokens_used or 0,
            cost_usd=m.cost_usd or 0.0,
            created_at=m.created_at.isoformat(),
        )
        for m in rows
    ]
    return ApiResponseWithPagination(
        data=data,
        pagination=PaginationDetails(
            nextCursor=None,
            hasMore=False,
            limit=100
        )
    )