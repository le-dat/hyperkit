"""Shared utilities — single source for cross-module helpers."""

from datetime import datetime, timezone


def _utcnow() -> datetime:
    """Return current UTC datetime. Use this instead of datetime.utcnow()."""
    return datetime.now(timezone.utc)