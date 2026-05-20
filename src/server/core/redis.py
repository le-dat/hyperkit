# ai-server/core/redis.py
import structlog
import redis.asyncio as aioredis
from typing import Any

from config import settings
from core.exceptions import RedisConnectionError

logger = structlog.get_logger()


async def init_redis_pools(app: Any) -> None:
    """Verify and initialize 3 Isolated Redis Connection Pools on app.state."""
    try:
        # Pool 1: redis_stream (Async pool for long-running SSE streams & Pub/Sub)
        app.state.redis_stream = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=300,  # Long timeout allowed for streaming active connections
            max_connections=50,
        )
        
        # Pool 2: redis_worker (Isolated pool for background worker tasks communication)
        app.state.redis_worker = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=10,
            max_connections=20,
        )
        
        # Pool 3: redis_cache (Fast-fail Cache Pool - with ultra-strict short timeouts)
        app.state.redis_cache = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,    # Fast-fail: 1s max waiting time to protect latency
            max_connections=30,
        )

        # For backward compatibility, assign redis_stream to redis
        app.state.redis = app.state.redis_stream

        # Ping to verify basic connection
        await app.state.redis_cache.ping()
        app.state.redis_ready = True
    except Exception as e:
        logger.error("redis_pools_startup_failed", error=str(e))
        raise RedisConnectionError(f"Redis connection pools failed: {e}")


async def close_redis_pools(app: Any) -> None:
    """Shutdown and close all active Redis connection pools on app.state."""
    try:
        if hasattr(app.state, "redis_stream"):
            await app.state.redis_stream.close()
        if hasattr(app.state, "redis_worker"):
            await app.state.redis_worker.close()
        if hasattr(app.state, "redis_cache"):
            await app.state.redis_cache.close()
    except Exception as e:
        logger.warning("redis_pools_shutdown_failed", error=str(e))
