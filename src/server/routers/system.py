# ai-server/routers/system.py
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    # Use cached health state from startup — avoids redundant SELECT 1
    redis_ok = getattr(request.app.state, "redis_ready", False)
    db_ok = getattr(request.app.state, "db_ready", False)

    # Double-check Redis is still responsive (cheap ping)
    if redis_ok:
        try:
            await request.app.state.redis.ping()
        except Exception:
            redis_ok = False

    status = "ok" if (redis_ok and db_ok) else "degraded"
    return {
        "status": status,
        "redis": redis_ok,
        "database": db_ok,
    }
