"""ARQ worker — runs LangGraph agent and streams events via Redis PubSub."""

import os
import json
from datetime import datetime, timezone

import redis.asyncio as aioredis
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.callbacks import get_openai_callback

from db.models import init_db
from db.chat_history import save_message, get_conversation_messages
from state.memory import remember_entity
from guards.budget import check_budget_and_alert
from config import settings

# Configurable Tier 1 memory window
WORKING_MEMORY_LIMIT = int(os.getenv("WORKING_MEMORY_LIMIT", "5"))


def _utcnow():
    return datetime.now(timezone.utc)


class StreamThoughtParser:
    def __init__(self):
        self.in_thought = False
        self.thought_tag_seen = False
        self.buffer = ""

    def feed(self, chunk: str) -> list[tuple[str, str]]:
        self.buffer += chunk
        events = []

        if not self.thought_tag_seen and "<thought>" in self.buffer:
            self.thought_tag_seen = True
            self.in_thought = True
            pre_thought, post_thought = self.buffer.split("<thought>", 1)
            if pre_thought:
                events.append(("token_stream", pre_thought))
            self.buffer = post_thought

        if self.in_thought and "</thought>" in self.buffer:
            self.in_thought = False
            thought_content, post_thought = self.buffer.split("</thought>", 1)
            if thought_content:
                events.append(("thought_stream", thought_content))
            self.buffer = post_thought

        if self.in_thought:
            safe_len = max(0, len(self.buffer) - 15)
            if safe_len > 0:
                events.append(("thought_stream", self.buffer[:safe_len]))
                self.buffer = self.buffer[safe_len:]
        else:
            if self.thought_tag_seen:
                if self.buffer:
                    events.append(("token_stream", self.buffer))
                    self.buffer = ""
            else:
                safe_len = max(0, len(self.buffer) - 15)
                if safe_len > 0:
                    events.append(("token_stream", self.buffer[:safe_len]))
                    self.buffer = self.buffer[safe_len:]

        return events

    def flush(self) -> list[tuple[str, str]]:
        events = []
        if self.buffer:
            if self.in_thought:
                events.append(("thought_stream", self.buffer))
            else:
                events.append(("token_stream", self.buffer))
            self.buffer = ""
        return events


async def run_agent_task(
    ctx: dict,
    *,
    turn_id: str,
    conversation_id: str,
    user_id: str,
    message: str,
):
    """
    ARQ task — runs LangGraph agent, streams events to Redis PubSub.

    Flow:
      1. Streaming deduplication lock (Redis SET NX, 30s TTL)
      2. Load history (Tier 1 memory)
      3. Run graph.astream_events() with periodic cancellation check
      4. Publish token_stream → sse:{turn_id}
      5. On complete: save to PostgreSQL + extract entities + release lock
    """
    from agents.supervisor import graph

    redis: aioredis.Redis = ctx["redis"]
    stream_lock_key = f"lock:stream:{conversation_id}"

    # ── 1. Streaming deduplication check ─────────────────────────────────
    is_locked = await redis.set(stream_lock_key, turn_id, ex=30, nx=True)
    if not is_locked:
        await redis.publish(
            f"sse:{turn_id}",
            json.dumps({
                "event": "warning",
                "data": {"message": "Streaming already active for this conversation"},
            }),
        )
        await redis.hset(f"session:{turn_id}", "status", "ignored")
        # Send terminal event so client doesn't hang
        await redis.publish(f"sse:{turn_id}", json.dumps({"event": "ignored", "data": {}}))
        return

    await redis.hset(f"session:{turn_id}", mapping={
        "status": "running",
        "started_at": _utcnow().isoformat(),
    })

    try:
        # ── 2. Build messages with conversation history ─────────────────
        history_rows = await get_conversation_messages(conversation_id, user_id, limit=WORKING_MEMORY_LIMIT)
        messages = [
            HumanMessage(content=r.content) if r.role == "user" else AIMessage(content=r.content)
            for r in history_rows
        ]
        messages.append(HumanMessage(content=message))

        # ── 3. Stream agent with cost tracking and cancellation checks ──
        config = {"configurable": {"thread_id": conversation_id}}
        full_response = ""
        full_thoughts = ""
        tokens_used = 0
        cost_usd = 0.0
        parser = StreamThoughtParser()

        with get_openai_callback() as cb:
            async for event in graph.astream_events(
                {
                    "messages": messages,
                    "task": message,
                    "conversation_id": conversation_id,
                    "turn_id": turn_id,
                    "user_id": user_id,
                    "attempts": 0,
                    "errors": [],
                    "approved": False,
                },
                config=config,
                version="v2",
            ):
                # Periodic cancellation check
                if await redis.exists(f"cancel:{turn_id}"):
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({"event": "cancelled", "data": {"message": "Task cancelled by user"}}),
                    )
                    await redis.hset(f"session:{turn_id}", "status", "cancelled")
                    # Save user's cancelled message to history
                    try:
                        await save_message(
                            conversation_id, user_id, "user", message,
                            tokens_used=0, cost_usd=0.0,
                        )
                    except Exception:
                        pass
                    return

                etype = event["event"]

                if etype == "on_chat_model_stream":
                    chunk = event["data"]["chunk"].content
                    if chunk:
                        text_chunk = ""
                        if isinstance(chunk, list):
                            for block in chunk:
                                if isinstance(block, dict) and block.get("type") == "text":
                                    text_chunk += block.get("text", "")
                                elif isinstance(block, str):
                                    text_chunk += block
                        elif isinstance(chunk, str):
                            text_chunk = chunk
                        else:
                            text_chunk = str(chunk)

                        if text_chunk:
                            parsed_events = parser.feed(text_chunk)
                            for pevent_type, pdata in parsed_events:
                                if pevent_type == "thought_stream":
                                    full_thoughts += pdata
                                    await redis.publish(
                                        f"sse:{turn_id}",
                                        json.dumps({"event": "thought_stream", "data": pdata}),
                                    )
                                else:
                                    full_response += pdata
                                    await redis.publish(
                                        f"sse:{turn_id}",
                                        json.dumps({"event": "token_stream", "data": pdata}),
                                    )

                elif etype == "on_tool_start":
                    tool_name = event["name"]
                    tool_input = event["data"].get("input", "")
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({
                            "event": "agent_thinking",
                            "data": {
                                "step": "start",
                                "tool": tool_name,
                                "input": tool_input,
                                "status": f"Running tool: {tool_name}..."
                            }
                        }),
                    )

                elif etype == "on_tool_end":
                    tool_name = event["name"]
                    tool_output = event["data"].get("output", "")
                    str_output = str(tool_output)
                    truncated_output = str_output[:1000] + "..." if len(str_output) > 1000 else str_output
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({
                            "event": "agent_thinking",
                            "data": {
                                "step": "end",
                                "tool": tool_name,
                                "output": truncated_output,
                                "status": f"Completed tool: {tool_name}"
                            }
                        }),
                    )

                elif etype == "on_chain_start" and event.get("name") in ("process", "human_gate"):
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({
                            "event": "node_start",
                            "data": {"node": event.get("name", "")},
                        }),
                    )

                elif "human_gate" in event.get("name", "") and etype == "on_chain_end":
                    # Publish awaiting_approval as terminal event so SSE client transitions
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({
                            "event": "human_gate_awaiting",
                            "data": {"turn_id": turn_id, "message": "Awaiting approval"},
                        }),
                    )
                    await redis.hset(f"session:{turn_id}", "status", "awaiting_approval")
                    return  # Worker stops here — resume via /approve endpoint

            # Flush any remaining buffer in parser
            for pevent_type, pdata in parser.flush():
                if pevent_type == "thought_stream":
                    full_thoughts += pdata
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({"event": "thought_stream", "data": pdata}),
                    )
                else:
                    full_response += pdata
                    await redis.publish(
                        f"sse:{turn_id}",
                        json.dumps({"event": "token_stream", "data": pdata}),
                    )

            tokens_used = cb.total_tokens
            cost_usd = cb.total_cost

        # ── 4. Budget check ──────────────────────────────────────────────
        await check_budget_and_alert("run_agent_task", cost_usd)

        # ── 4.5 checkpointer state recovery fallback & errors ────────────
        state_snapshot = await graph.aget_state(config)
        final_state = state_snapshot.values if state_snapshot else {}

        # 1. Assert task failure if final state contains errors
        errors = final_state.get("errors", [])
        attempts = final_state.get("attempts", 0)
        from agents.supervisor import MAX_ATTEMPTS
        if errors and attempts >= MAX_ATTEMPTS:
            raise RuntimeError(f"Agent reasoning failed: {errors[0]}")

        # 2. State recovery: fallback to final state results if full_response is empty
        if not full_response:
            final_result = final_state.get("result", "")
            if final_result:
                full_response = final_result
            else:
                # Fallback to last AIMessage
                messages_list = final_state.get("messages", [])
                if messages_list and hasattr(messages_list[-1], "content") and messages_list[-1].content:
                    full_response = messages_list[-1].content

        # Extract thoughts if they are still embedded in full_response
        if "<thought>" in full_response and "</thought>" in full_response:
            parts = full_response.split("</thought>", 1)
            thought_part = parts[0].split("<thought>", 1)[-1]
            if not full_thoughts:
                full_thoughts = thought_part
            full_response = parts[1]
        elif "<thought>" in full_response:
            parts = full_response.split("<thought>", 1)
            if not full_thoughts:
                full_thoughts = parts[1]
            full_response = parts[0]

        # ── 5. Persist assistant response to PostgreSQL ─────────────────
        if full_response:
            await save_message(
                conversation_id, user_id, "assistant", full_response,
                thoughts=full_thoughts or None,
                tokens_used=tokens_used, cost_usd=cost_usd,
            )

        # ── 6. Extract entities to Tier 3 memory ───────────────────────
        await remember_entity(
            redis, conversation_id, "last_response", full_response[:200],
        )

        # ── 7. Signal completion ─────────────────────────────────────────
        await redis.publish(
            f"sse:{turn_id}",
            json.dumps({
                "event": "agent_complete",
                "data": {"tokens": tokens_used, "cost_usd": cost_usd},
            }),
        )
        await redis.hset(f"session:{turn_id}", "status", "complete")

    except Exception as e:
        await redis.publish(
            f"sse:{turn_id}",
            json.dumps({"event": "error", "data": {"message": str(e)}}),
        )
        await redis.hset(f"session:{turn_id}", "status", "failed")

        # Save failed message to history so user can see it and retry
        error_content = f"Error: {str(e)}"
        try:
            await save_message(
                conversation_id, user_id, "user", message,
                tokens_used=0, cost_usd=0.0,
            )
            await save_message(
                conversation_id, user_id, "assistant", error_content,
                tokens_used=0, cost_usd=0.0,
            )
        except Exception as _:
            # Don't let save failure mask the original error
            pass

        raise
    finally:
        # Atomic lock release via Lua script — avoids race between get and delete
        await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1, stream_lock_key, turn_id,
        )


def _parse_redis_url(redis_url: str):
    """Parse redis:// URL into RedisSettings for WorkerSettings."""
    from urllib.parse import urlparse
    from arq.connections import RedisSettings
    parsed = urlparse(redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [run_agent_task]
    redis_settings = _parse_redis_url(settings.redis_url)
    max_jobs = 10
    job_timeout = 300  # 5 minutes max per task

    async def on_startup(ctx: dict):
        await init_db(settings.database_url)
        ctx["redis"] = await aioredis.from_url(settings.redis_url, decode_responses=True)

    async def on_shutdown(ctx: dict):
        await ctx["redis"].close()