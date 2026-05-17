"""Agent router — POST /agent/invoke, approve, reject, state endpoints."""

import uuid
import json
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from arq import create_pool
from arq.connections import RedisSettings

from auth.clerk import get_current_user_dep
from db.chat_history import ensure_conversation, save_message, _verify_ownership
from guards.input import guard_input
from agents.supervisor import graph
from config import settings


router = APIRouter(prefix="/agent", tags=["agent"])


def _parse_redis_url(redis_url: str) -> RedisSettings:
    """Parse settings.redis_url into RedisSettings for ARQ."""
    parsed = urlparse(redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
    )


class InvokeRequest(BaseModel):
    conversation_id: str | None = None  # None = new conversation
    message: str


@router.post("/invoke")
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
    await redis.hset(f"session:{turn_id}", mapping={
        "status": "queued",
        "conversation_id": conversation_id,
        "user_id": user,
    })
    await redis.expire(f"session:{turn_id}", 3600)

    # Enqueue ARQ job — pool is closed immediately after use
    pool = await create_pool(_parse_redis_url(settings.redis_url))
    try:
        await pool.enqueue_job(
            "run_agent_task",
            turn_id=turn_id,
            conversation_id=conversation_id,
            user_id=user,
            message=message,
        )
    finally:
        await pool.close()

    return {
        "turn_id": turn_id,
        "conversation_id": conversation_id,
        "sse_url": f"/sse/{turn_id}",
    }


@router.post("/{turn_id}/approve")
async def approve(turn_id: str, request: Request, user: str = Depends(get_current_user_dep)):
    """Resume a human-gate interrupted agent after approval."""
    redis = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")
    if not session:
        raise HTTPException(404, "Turn not found")
    if session.get("user_id") != user:
        raise HTTPException(403, "Forbidden")

    # Verify user owns the conversation
    if not await _verify_ownership(session["conversation_id"], user):
        raise HTTPException(403, "Forbidden")

    config = {"configurable": {"thread_id": session["conversation_id"]}}
    # Pass approved=True to update checkpointed state and allow graph to continue
    await graph.ainvoke({"messages": [], "approved": True}, config=config)
    await redis.hset(f"session:{turn_id}", "status", "resumed")
    return {"status": "resumed"}


@router.post("/{turn_id}/reject")
async def reject(turn_id: str, request: Request, user: str = Depends(get_current_user_dep)):
    """Reject a human-gate interrupted agent."""
    redis = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")
    if not session:
        raise HTTPException(404, "Turn not found")
    if session.get("user_id") != user:
        raise HTTPException(403, "Forbidden")

    # Verify user owns the conversation
    if not await _verify_ownership(session["conversation_id"], user):
        raise HTTPException(403, "Forbidden")

    await redis.hset(f"session:{turn_id}", "status", "rejected")
    await redis.publish(f"sse:{turn_id}", json.dumps({"event": "rejected", "data": {}}))
    return {"status": "rejected"}


@router.get("/{turn_id}/state")
async def get_state(turn_id: str, request: Request, user: str = Depends(get_current_user_dep)):
    """Get agent state and session info for a turn."""
    redis = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")
    if not session:
        raise HTTPException(404, "Turn not found")
    if session.get("user_id") != user:
        raise HTTPException(403, "Forbidden")

    # Verify user owns the conversation
    if not await _verify_ownership(session["conversation_id"], user):
        raise HTTPException(403, "Forbidden")

    config = {"configurable": {"thread_id": session["conversation_id"]}}
    state = graph.get_state(config)
    return {
        "session": dict(session),
        "agent_next": list(state.next),
    }