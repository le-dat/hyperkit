"""Redis session management utilities."""

from typing import Any
from core.schemas import SessionStatus, RedisKeys


def _session_key(turn_id: str) -> str:
    """Generate the Redis key for a given turn_id."""
    return RedisKeys.session(turn_id)


async def create_session(
    redis: Any,
    turn_id: str,
    conversation_id: str,
    user_id: str,
    status: SessionStatus = SessionStatus.QUEUED,
    expire_seconds: int = 3600,
) -> None:
    """Create a new agent session in Redis."""
    key = _session_key(turn_id)
    await redis.hset(
        key,
        mapping={
            "status": status,
            "conversation_id": conversation_id,
            "user_id": user_id,
        },
    )
    await redis.expire(key, expire_seconds)


async def update_session_status(
    redis: Any,
    turn_id: str,
    status: SessionStatus,
) -> None:
    """Update the status field of a Redis session."""
    await redis.hset(_session_key(turn_id), "status", status)


async def set_session_failed(
    redis: Any,
    turn_id: str,
    error: str,
) -> None:
    """Mark a session as failed and record the error message."""
    await redis.hset(
        _session_key(turn_id),
        mapping={
            "status": SessionStatus.FAILED,
            "error": error,
        },
    )


async def set_session_awaiting_approval(
    redis: Any,
    turn_id: str,
    interrupted_node: str,
) -> None:
    """Mark a session as awaiting human approval, identifying the interrupted node."""
    await redis.hset(
        _session_key(turn_id),
        mapping={
            "status": SessionStatus.AWAITING_APPROVAL,
            "interrupted_node": interrupted_node,
        },
    )


async def set_session_complete(
    redis: Any,
    turn_id: str,
    result: str,
) -> None:
    """Mark a session as complete and record the final response result."""
    await redis.hset(
        _session_key(turn_id),
        mapping={
            "status": SessionStatus.COMPLETE,
            "result": result,
        },
    )


async def get_session(
    redis: Any,
    turn_id: str,
) -> dict[str, str]:
    """Fetch the complete session hash dict from Redis."""
    return await redis.hgetall(_session_key(turn_id))
