# ai-server/routers/system.py
from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    # Check Redis
    try:
        redis_ok = await request.app.state.redis.ping()
    except Exception:
        redis_ok = False

    # Check DB
    db_ok = False
    try:
        from db.models import engine
        async with engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    status = "ok" if (redis_ok and db_ok) else "degraded"
    return {
        "status": status,
        "redis": redis_ok,
        "database": db_ok,
    }
