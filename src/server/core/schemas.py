# ai-server/core/schemas.py
from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")


class ApiSuccess(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: Optional[str] = None


class ApiErrorDetails(BaseModel):
    message: str
    status: Optional[int] = None
    code: Optional[str] = None


class ApiError(BaseModel):
    success: bool = False
    error: ApiErrorDetails


class PaginationDetails(BaseModel):
    nextCursor: Optional[str] = None
    hasMore: bool = False
    limit: int


class ApiResponseWithPagination(ApiSuccess[T], Generic[T]):
    pagination: PaginationDetails
