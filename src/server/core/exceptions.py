# ai-server/core/exceptions.py
import structlog
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = structlog.get_logger()


class RedisConnectionError(HTTPException):
    """Raised when the connection to Redis fails during startup or operation."""

    def __init__(self, detail: str = "Redis connection failed"):
        super().__init__(status_code=503, detail=detail)


class DBConnectionError(HTTPException):
    """Raised when the connection to the Database fails during startup or operation."""

    def __init__(self, detail: str = "Database connection failed"):
        super().__init__(status_code=503, detail=detail)


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "message": exc.detail,
                    "status": exc.status_code,
                    "code": "HTTP_ERROR"
                }
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors_summary = "; ".join([f"{'.'.join(str(loc_item) for loc_item in err['loc'])}: {err['msg']}" for err in exc.errors()])
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "message": f"Validation error: {errors_summary}",
                    "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "code": "VALIDATION_ERROR"
                }
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_error", error=str(exc))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "message": "Internal Server Error",
                    "status": 500,
                    "code": "INTERNAL_SERVER_ERROR"
                }
            }
        )
