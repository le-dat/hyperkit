import asyncio
import anyio
from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from auth.session import get_verified_session
from core.schemas import SSEEvent, SSEEventType, _STREAM_CLOSING_EVENTS, RedisKeys


router = APIRouter(prefix="/sse", tags=["sse"])

_SSE_TIMEOUT_SECONDS = 300


@router.get("/{turn_id}")
async def stream(
    turn_id: str,
    request: Request,
    session: dict = Depends(get_verified_session),
):
    redis = request.app.state.redis

    async def generate():
        pubsub = redis.pubsub()
        loop = asyncio.get_running_loop()
        try:
            await pubsub.subscribe(RedisKeys.sse_channel(turn_id))
            deadline = loop.time() + _SSE_TIMEOUT_SECONDS

            async for msg in pubsub.listen():
                if await request.is_disconnected():
                    break
                if loop.time() > deadline:
                    yield SSEEvent(SSEEventType.TIMEOUT, {"message": "SSE stream timed out after 5 minutes"}).to_yield()
                    break
                if msg.get("type") != "message":
                    continue

                event = SSEEvent.from_redis_message(msg)
                yield event.to_yield()

                if event.event in _STREAM_CLOSING_EVENTS:
                    break
        except asyncio.CancelledError:
            return
        finally:
            with anyio.CancelScope(shield=True):
                await pubsub.unsubscribe(RedisKeys.sse_channel(turn_id))
                await pubsub.aclose()

    return EventSourceResponse(
        generate(),
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )