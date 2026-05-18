# ai-server/routers/system.py
import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel
from core.schemas import ApiSuccess

logger = structlog.get_logger()
router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    redis: bool
    database: bool


@router.get("/health", response_model=ApiSuccess[HealthResponse])
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
    return ApiSuccess(
        data=HealthResponse(
            status=status,
            redis=redis_ok,
            database=db_ok
        )
    )
