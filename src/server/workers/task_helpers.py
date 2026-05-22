"""ARQ worker helper utilities."""

from datetime import datetime, timezone
from urllib.parse import urlparse

from arq.connections import RedisSettings

import sys
from pathlib import Path

# Resolve server/ path so db.utils can be imported
_server_path = str(Path(__file__).resolve().parents[1])
if _server_path not in sys.path:
    sys.path.insert(0, _server_path)

from db.utils import _utcnow


def _parse_redis_url(redis_url: str) -> RedisSettings:
    """Parse redis:// URL into RedisSettings for WorkerSettings."""
    parsed = urlparse(redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )