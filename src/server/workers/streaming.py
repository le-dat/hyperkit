"""Streaming utilities — token batching and thought tag parsing."""

import os

import redis.asyncio as aioredis

from core.schemas import SSEEvent, SSEEventType

# Number of token characters to batch before a forced flush to Redis PubSub.
# 20 chars is a good balance: reduces round-trips while keeping latency < 50ms.
TOKEN_BATCH_SIZE = int(os.getenv("TOKEN_BATCH_SIZE", "20"))


class TokenBatcher:
    """
    Accumulates token chars and flushes them as a single Redis PubSub publish.

    Reduces round-trips when the LLM streams tokens rapidly — instead of one
    publish per token we batch up to TOKEN_BATCH_SIZE chars before flushing.
    Flushing also happens on non-token events so tokens are never delayed
    past the next tool call or node transition.
    """

    def __init__(self, redis: aioredis.Redis, channel: str):
        self.redis = redis
        self.channel = channel
        self.text_buf: list[str] = []
        self.thought_buf: list[str] = []
        self.char_count = 0

    async def add_token(self, text: str) -> None:
        self.text_buf.append(text)
        self.char_count += len(text)
        if self.char_count >= TOKEN_BATCH_SIZE:
            await self._flush()

    async def add_thought(self, text: str) -> None:
        self.thought_buf.append(text)
        self.char_count += len(text)
        if self.char_count >= TOKEN_BATCH_SIZE:
            await self._flush()

    async def _flush(self) -> None:
        if not self.text_buf and not self.thought_buf:
            return
        if self.thought_buf:
            thought_text = "".join(self.thought_buf)
            await SSEEvent(SSEEventType.THOUGHT_STREAM, thought_text).publish(
                self.redis, self.channel
            )
            self.thought_buf.clear()
        if self.text_buf:
            token_text = "".join(self.text_buf)
            await SSEEvent(SSEEventType.TOKEN_STREAM, token_text).publish(
                self.redis, self.channel
            )
            self.text_buf.clear()
        self.char_count = 0

    async def flush(self) -> None:
        """Flush remaining tokens — called at end of stream and on non-token events."""
        await self._flush()


class StreamThoughtParser:
    """Parses <thought> tags from streaming LLM output."""

    def __init__(self):
        self.in_thought = False
        self.thought_tag_seen = False
        self.buffer = ""

    def feed(self, chunk: str) -> list[tuple[SSEEventType, str]]:
        self.buffer += chunk
        events = []

        if not self.thought_tag_seen and "<thought>" in self.buffer:
            self.thought_tag_seen = True
            self.in_thought = True
            pre_thought, post_thought = self.buffer.split("<thought>", 1)
            if pre_thought:
                events.append((SSEEventType.TOKEN_STREAM, pre_thought))
            self.buffer = post_thought

        if self.in_thought and "</thought>" in self.buffer:
            self.in_thought = False
            thought_content, post_thought = self.buffer.split("</thought>", 1)
            if thought_content:
                events.append((SSEEventType.THOUGHT_STREAM, thought_content))
            self.buffer = post_thought

        elif self.in_thought:
            # Inside <thought> but </thought> not yet in buffer
            # Don't speculative-emit — wait for closing tag to arrive
            pass
        else:
            if self.thought_tag_seen:
                # After </thought>, everything is token stream
                if self.buffer:
                    events.append((SSEEventType.TOKEN_STREAM, self.buffer))
                    self.buffer = ""
            else:
                # No opening tag seen yet — emit everything
                if self.buffer:
                    events.append((SSEEventType.TOKEN_STREAM, self.buffer))
                    self.buffer = ""

        return events

    def flush(self) -> list[tuple[SSEEventType, str]]:
        events = []
        if self.buffer:
            if self.in_thought:
                events.append((SSEEventType.THOUGHT_STREAM, self.buffer))
            else:
                events.append((SSEEventType.TOKEN_STREAM, self.buffer))
            self.buffer = ""
        return events