# ai-server/routers/system.py
import structlog
from fastapi import APIRouter, Request

logger = structlog.get_logger()
router = APIRouter()


@router.get("/health")
async def health(request: Request):
    redis_ok = getattr(request.app.state, "redis_ready", False)
    db_ok = getattr(request.app.state, "db_ready", False)

    # Light Redis re-check (ping the fast-fail pool to avoid blocking)
    if redis_ok:
        try:
            await request.app.state.redis_cache.ping()
        except Exception:
            redis_ok = False

    status = "ok" if (redis_ok and db_ok) else "degraded"
    return {"status": status, "redis": redis_ok, "database": db_ok}
