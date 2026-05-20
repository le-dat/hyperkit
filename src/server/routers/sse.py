"""SSE router — bridges Redis PubSub to browser EventSource."""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from auth.clerk import get_current_user_dep


router = APIRouter(prefix="/sse", tags=["sse"])

# Events that close the SSE stream
_TERMINAL_EVENTS = {"agent_complete", "error", "rejected", "ignored", "cancelled"}

# Max SSE stream duration (seconds)
_SSE_TIMEOUT_SECONDS = 300


@router.get("/{turn_id}")
async def stream(turn_id: str, request: Request, user: str = Depends(get_current_user_dep)):
    """
    SSE endpoint — bridges Redis PubSub → browser EventSource.

    Worker publishes: redis.publish("sse:{turn_id}", json_event)
    Browser receives: streamed tokens in real-time via EventSource
    """
    redis = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")

    if not session:
        raise HTTPException(404, "Turn not found")

    if session.get("user_id") != user:
        raise HTTPException(403, "Forbidden")

    async def generate():
        pubsub = redis.pubsub()
        try:
            await pubsub.subscribe(f"sse:{turn_id}")
            deadline = asyncio.get_event_loop().time() + _SSE_TIMEOUT_SECONDS

            async for msg in pubsub.listen():
                if await request.is_disconnected():
                    break
                if asyncio.get_event_loop().time() > deadline:
                    yield {"event": "timeout", "data": json.dumps({"message": "SSE stream timed out after 5 minutes"})}
                    break
                if msg.get("type") != "message":
                    continue

                payload = json.loads(msg["data"])
                # Forward data as-is. The worker already JSON-serializes everything correctly:
                # - token_stream/thought_stream: data is a plain string
                # - agent_complete/error/etc: data is an object (dict/list) that EventSourceResponse
                #   will serialize correctly when writing the SSE line
                event_name = payload.get("event", "message")
                event_data = payload.get("data")
                # Ensure data is always a string for SSE format
                if isinstance(event_data, str):
                    data_str = event_data
                else:
                    data_str = json.dumps(event_data) if event_data is not None else "{}"

                yield {"event": event_name, "data": data_str}

                if event_name in _TERMINAL_EVENTS:
                    break
        finally:
            await pubsub.unsubscribe(f"sse:{turn_id}")
            await pubsub.aclose()

    return EventSourceResponse(generate())