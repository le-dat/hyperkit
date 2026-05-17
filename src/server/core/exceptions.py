# ai-server/core/exceptions.py
from fastapi import HTTPException


class RedisConnectionError(HTTPException):
    """Raised when the connection to Redis fails during startup or operation."""

    def __init__(self, detail: str = "Redis connection failed"):
        super().__init__(status_code=503, detail=detail)


class DBConnectionError(HTTPException):
    """Raised when the connection to the Database fails during startup or operation."""

    def __init__(self, detail: str = "Database connection failed"):
        super().__init__(status_code=503, detail=detail)
