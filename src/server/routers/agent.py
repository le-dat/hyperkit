"""Agent router — POST /agent/invoke, approve, reject, state endpoints."""

from typing import Any
import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from auth.clerk import get_current_user_dep
from auth.session import get_verified_session
from db.chat_history import ensure_conversation, save_message, _verify_ownership
from guards.input import guard_input
from agents import graph
from core.schemas import ApiSuccess, SSEEvent, SSEEventType, SessionStatus
from state import create_session, update_session_status


router = APIRouter(prefix="/agent", tags=["agent"])


class InvokeRequest(BaseModel):
    conversation_id: str | None = None  # None = new conversation
    message: str


class InvokeResponse(BaseModel):
    turn_id: str
    conversation_id: str
    sse_url: str


class StatusResponse(BaseModel):
    status: str


class StateResponse(BaseModel):
    session: dict[str, Any]
    agent_next: list[str]
    agent_state: dict[str, Any]


@router.post("/invoke", response_model=ApiSuccess[InvokeResponse])
async def invoke(body: InvokeRequest, request: Request, user: str = Depends(get_current_user_dep)):
    """Enqueue a new agent task."""
    conversation_id = body.conversation_id or str(uuid.uuid4())
    turn_id = str(uuid.uuid4())

    # Sanitize input
    message = guard_input(body.message, user_id=user)

    # Ensure conversation exists and save user message
    await ensure_conversation(conversation_id, user, first_message=message)
    await save_message(conversation_id, user, "user", message)

    # Write Redis session
    redis = request.app.state.redis
    await create_session(redis, turn_id, conversation_id, user)

    # Enqueue ARQ job using the cached pool from app startup
    await request.app.state.arq_pool.enqueue_job(
        "run_agent_task",
        turn_id=turn_id,
        conversation_id=conversation_id,
        user_id=user,
        message=message,
    )

    return ApiSuccess(
        data=InvokeResponse(
            turn_id=turn_id,
            conversation_id=conversation_id,
            sse_url=f"/sse/{turn_id}",
        )
    )


@router.post("/{turn_id}/approve", response_model=ApiSuccess[StatusResponse])
async def approve(
    turn_id: str,
    request: Request,
    user: str = Depends(get_current_user_dep),
    session: dict = Depends(get_verified_session),
):
    """Resume a human-gate interrupted agent after approval.

    Sets approved=True in checkpoint, then enqueues a resume task so the
    worker can re-stream tokens to SSE. This avoids the race where the
    original task's SSE stream has already closed before approval fires.
    """
    # Verify user owns the conversation
    if not await _verify_ownership(session["conversation_id"], user):
        raise HTTPException(403, "Forbidden")

    # Idempotency: prevent double-approve from racing
    redis = request.app.state.redis
    lock_key = f"lock:approve:{turn_id}"
    acquired = await redis.set(lock_key, "1", ex=30, nx=True)
    if not acquired:
        raise HTTPException(409, "Already approved or rejected")

    config = {"configurable": {"thread_id": session["conversation_id"]}}
    # Resume the checkpointed graph from the interrupt point with approved=True
    await graph.ainvoke({"messages": [], "approved": True}, config=config)
    await update_session_status(redis, turn_id, SessionStatus.RESUMED)

    # Enqueue a continuation task that re-streams tokens to SSE.
    # The original task already finished and closed SSE — we need a fresh
    # worker run to publish the resumed response.
    await request.app.state.arq_pool.enqueue_job(
        "resume_agent_task",
        turn_id=turn_id,
        conversation_id=session["conversation_id"],
        user_id=user,
    )

    return ApiSuccess(data=StatusResponse(status=SessionStatus.RESUMED))


@router.post("/{turn_id}/reject", response_model=ApiSuccess[StatusResponse])
async def reject(
    turn_id: str,
    request: Request,
    user: str = Depends(get_current_user_dep),
    session: dict = Depends(get_verified_session),
):
    """Reject a human-gate interrupted agent."""
    # Verify user owns the conversation
    if not await _verify_ownership(session["conversation_id"], user):
        raise HTTPException(403, "Forbidden")

    # Idempotency: prevent double-reject from racing
    redis = request.app.state.redis
    lock_key = f"lock:approve:{turn_id}"
    acquired = await redis.set(lock_key, "1", ex=30, nx=True)
    if not acquired:
        raise HTTPException(409, "Already approved or rejected")

    await update_session_status(redis, turn_id, SessionStatus.REJECTED)
    await SSEEvent(SSEEventType.REJECTED, {}).publish(redis, f"sse:{turn_id}")
    return ApiSuccess(data=StatusResponse(status=SessionStatus.REJECTED))


@router.get("/{turn_id}/state", response_model=ApiSuccess[StateResponse])
async def get_state(
    turn_id: str,
    request: Request,
    user: str = Depends(get_current_user_dep),
    session: dict = Depends(get_verified_session),
):
    """Get agent state and session info for a turn.

    Uses a short-lived Redis lock to prevent racing with concurrent
    worker checkpoint writes when the graph is mid-stream.
    """
    redis = request.app.state.redis
    lock_key = f"lock:state:{turn_id}"

    # Acquire read lock (5s TTL — get_state should be fast)
    acquired = await redis.set(lock_key, "1", ex=5, nx=True)
    if not acquired:
        raise HTTPException(423, "State temporarily unavailable, retry soon")

    try:
        config = {"configurable": {"thread_id": session["conversation_id"]}}
        state = graph.get_state(config)
        return ApiSuccess(
            data=StateResponse(
                session=dict(session),
                agent_next=list(state.next),
                agent_state=dict(state.values) if state.values else {},
            )
        )
    finally:
        await redis.delete(lock_key)