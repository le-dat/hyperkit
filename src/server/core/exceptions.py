import structlog
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from core.schemas import ApiError

logger = structlog.get_logger()


class RedisConnectionError(HTTPException):
    def __init__(self, detail: str = "Redis connection failed"):
        super().__init__(status_code=503, detail=detail)


class DBConnectionError(HTTPException):

    def __init__(self, detail: str = "Database connection failed"):
        super().__init__(status_code=503, detail=detail)


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        error_payload = ApiError.create(
            message=exc.detail,
            status=exc.status_code,
            code="HTTP_ERROR"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload.model_dump()
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors_summary = "; ".join([f"{'.'.join(str(loc_item) for loc_item in err['loc'])}: {err['msg']}" for err in exc.errors()])
        error_payload = ApiError.create(
            message=f"Validation error: {errors_summary}",
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR"
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_payload.model_dump()
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", None)
        logger.error("unhandled_error", request_id=request_id, error=str(exc))
        error_payload = ApiError.create(
            message="Internal Server Error",
            status=500,
            code="INTERNAL_SERVER_ERROR",
            request_id=request_id
        )
        return JSONResponse(
            status_code=500,
            content=error_payload.model_dump()
        )