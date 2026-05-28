import sys
from pathlib import Path

# Resolve server/ path so core.schemas can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import redis.asyncio as aioredis
from dataclasses import dataclass, field

from core.schemas import RedisKeys
from workers.streaming import TokenBatcher, StreamThoughtParser


@dataclass
class TaskContext:
    """Bundled context for a single agent task run."""
    redis: aioredis.Redis
    turn_id: str
    conversation_id: str
    user_id: str
    message: str
    stream_lock_key: str
    sse_channel: str = field(init=False)
    batcher: TokenBatcher = field(init=False)
    parser: StreamThoughtParser = field(init=False)
    full_response: str = ""
    full_thoughts: str = ""
    tokens_used: int = 0
    cost_usd: float = 0.0

    def __post_init__(self):
        self.sse_channel = RedisKeys.sse_channel(self.turn_id)
        self.batcher = TokenBatcher(self.redis, self.sse_channel)
        self.parser = StreamThoughtParser()
