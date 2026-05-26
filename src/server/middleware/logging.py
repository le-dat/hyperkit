# ai-server/middleware/logging.py
import time
import uuid
import structlog
from fastapi import Request

async def log_requests(request: Request, call_next):
    # Ignore healthcheck paths to keep logs clean
    if request.url.path in ("/v1/health", "/health"):
        return await call_next(request)

    logger = structlog.get_logger()
    request_id = str(uuid.uuid4())[:8]

    # Store on request state so exception handlers can include it
    request.state.request_id = request_id

    start_time = time.perf_counter()

    with structlog.contextvars.bound_contextvars(request_id=request_id):
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        log_level = "warning" if response.status_code >= 400 else "info"
        getattr(logger, log_level)(
            "request_finished",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response