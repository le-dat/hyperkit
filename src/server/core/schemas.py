# ai-server/core/schemas.py
from typing import Any, Generic, TypeVar, Optional
from dataclasses import dataclass
import json
from pydantic import BaseModel

T = TypeVar("T")


# ── SSE Event Type Constants ───────────────────────────────────────────────
class SSEEventType:
    """Canonical SSE event type strings. Use these instead of magic strings."""

    # Terminal events — these close the SSE stream
    AGENT_COMPLETE = "agent_complete"
    ERROR = "error"
    REJECTED = "rejected"
    IGNORED = "ignored"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"

    # Stream events — data chunks
    TOKEN_STREAM = "token_stream"
    THOUGHT_STREAM = "thought_stream"

    # Progress / debug events
    AGENT_THINKING = "agent_thinking"
    NODE_START = "node_start"
    HUMAN_GATE_AWAITING = "human_gate_awaiting"

    # Non-terminal signals
    WARNING = "warning"


# ── Session Status Constants ───────────────────────────────────────────────
class SessionStatus:
    """Canonical session status strings for Redis session tracking."""

    QUEUED = "queued"
    RUNNING = "running"
    RESUMED = "resumed"
    AWAITING_APPROVAL = "awaiting_approval"
    REJECTED = "rejected"
    IGNORED = "ignored"
    CANCELLED = "cancelled"
    COMPLETE = "complete"
    FAILED = "failed"


_STREAM_CLOSING_EVENTS = frozenset({
    SSEEventType.AGENT_COMPLETE,
    SSEEventType.ERROR,
    SSEEventType.REJECTED,
    SSEEventType.IGNORED,
    SSEEventType.CANCELLED,
})


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


def _ensure_string_payload(data: Any) -> str:
    """Helper to guarantee that SSE data is a string."""
    if isinstance(data, str):
        return data
    return json.dumps(data) if data is not None else "{}"


def _parse_redis_payload(msg: dict) -> dict:
    """Helper to parse JSON data safely from a Redis message dict."""
    raw_data = msg.get("data")
    if not raw_data:
        return {}
    try:
        return json.loads(raw_data)
    except (json.JSONDecodeError, TypeError):
        return {}


@dataclass
class SSEEvent:
    """Typed SSE event — enforces consistent event/data shape across the app."""
    event: str
    data: Any = None

    @classmethod
    def from_redis_message(cls, msg: dict) -> "SSEEvent":
        """Parse a raw Redis PubSub message dict into an SSEEvent."""
        payload = _parse_redis_payload(msg)
        return cls(
            event=payload.get("event", "message"),
            data=payload.get("data"),
        )

    def to_yield(self) -> dict:
        """Serialize to the dict format expected by EventSourceResponse."""
        return {"event": self.event, "data": _ensure_string_payload(self.data)}

    def serialize(self) -> str:
        """Serialize to JSON string for redis.publish()."""
        return json.dumps({"event": self.event, "data": self.data})

    async def publish(self, redis, channel: str) -> None:
        """Publish this event to a Redis PubSub channel."""
        await redis.publish(channel, self.serialize())