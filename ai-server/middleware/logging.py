# ai-server/middleware/logging.py
import uuid
import structlog
from fastapi import Request

async def log_requests(request: Request, call_next):
    logger = structlog.get_logger()
    request_id = str(uuid.uuid4())[:8]
    
    with structlog.contextvars.bound_contextvars(request_id=request_id):
        logger.info(
            "request_started",
            method=request.method,
            path=request.url.path,
        )
        response = await call_next(request)
        log_level = "warning" if response.status_code >= 400 else "info"
        getattr(logger, log_level)(
            "request_finished",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
        )
        return response
