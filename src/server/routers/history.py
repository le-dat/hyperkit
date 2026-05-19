"""History router — conversation list for sidebar + message replay."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select

from auth.clerk import get_current_user_dep
from db.chat_history import get_user_conversations, update_conversation_title as update_title_db, _verify_ownership
from db.models import AsyncSessionLocal, Conversation, Message
from core.schemas import ApiResponseWithPagination, ApiSuccess, PaginationDetails


router = APIRouter(prefix="/history", tags=["history"])


class ConversationItem(BaseModel):
    conversation_id: str
    title: str
    updated_at: str


class MessageItem(BaseModel):
    role: str
    content: str
    thoughts: str | None = None
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


class DeleteConversationResponse(BaseModel):
    deleted: str


class UpdateTitleRequest(BaseModel):
    title: str


@router.delete("/{conversation_id}", response_model=ApiSuccess[DeleteConversationResponse])
async def delete_conversation(
    conversation_id: str,
    user: str = Depends(get_current_user_dep),
):
    if not await _verify_ownership(conversation_id, user):
        raise HTTPException(403, "Forbidden")

    async with AsyncSessionLocal() as db:
        await db.execute(
            delete(Message).where(Message.conversation_id == conversation_id)
        )
        await db.execute(
            delete(Conversation).where(Conversation.conversation_id == conversation_id)
        )
        await db.commit()

    return ApiSuccess(data={"deleted": conversation_id})


@router.patch("/{conversation_id}", response_model=ApiSuccess[dict])
async def update_conversation_title(
    conversation_id: str,
    request: UpdateTitleRequest,
    user: str = Depends(get_current_user_dep),
):
    updated = await update_title_db(conversation_id, user, request.title)
    if not updated:
        raise HTTPException(404, "Conversation not found")
    return ApiSuccess(data={"conversation_id": conversation_id})


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
            thoughts=m.thoughts,
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