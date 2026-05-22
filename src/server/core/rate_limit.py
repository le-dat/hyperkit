"""Redis-backed rate limiting utilities."""

import time
from functools import wraps
from typing import Callable

from fastapi import Request, HTTPException
from starlette.responses import JSONResponse

# sliding window: allow N requests per window_seconds per key


async def check_rate_limit(
    redis_client,
    key: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """
    Atomic sliding-window rate limit check using Redis.

    Returns (allowed, remaining, retry_after).
    """
    now = time.time()
    window_start = now - window_seconds
    redis_key = f"ratelimit:{key}"

    # Remove old entries outside the window atomically
    await redis_client.zremrangebyscore(redis_key, 0, window_start)

    # Count current entries in window
    count = await redis_client.zcard(redis_key)

    if count >= limit:
        oldest = await redis_client.zrange(redis_key, 0, 0, withscores=True)
        retry_after = int(oldest[0][1] + window_seconds - now) if oldest else window_seconds
        return False, 0, max(retry_after, 1)

    # Add new request timestamp
    await redis_client.zadd(redis_key, {f"{now}": now})
    await redis_client.expire(redis_key, window_seconds)

    remaining = limit - count - 1
    return True, max(remaining, 0), 0


def rate_limit(
    key_func: Callable[[Request], str],
    limit: int,
    window_seconds: int,
) -> Callable:
    """
    Decorator to rate-limit a FastAPI endpoint.

    Usage:
        @router.post("/toggle")
        @rate_limit(key_func=lambda r: r.state.user, limit=10, window_seconds=60)
        async def toggle(req: ToggleMcpReq, user: str = Depends(...)):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            redis = request.app.state.redis_worker
            key = key_func(request)

            allowed, remaining, retry_after = await check_rate_limit(
                redis, key, limit, window_seconds
            )

            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Rate limit exceeded. Try again in {retry_after}s.",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

            response = await func(request, *args, **kwargs)
            return response

        return wrapper
    return decorator
