"""ARQ worker — runs LangGraph agent and streams events via Redis PubSub."""

import os
import json
from datetime import datetime, timezone

import redis.asyncio as aioredis
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.callbacks import get_openai_callback

from db.chat_history import save_message, get_conversation_messages
from state.memory import remember_entity
from guards.budget import check_budget_and_alert
from config import settings

# Configurable Tier 1 memory window
WORKING_MEMORY_LIMIT = int(os.getenv("WORKING_MEMORY_LIMIT", "5"))


def _utcnow():
    return datetime.now(timezone.utc)


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
        tokens_used = 0
        cost_usd = 0.0

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
                    return

                etype = event["event"]

                if etype == "on_chat_model_stream":
                    chunk = event["data"]["chunk"].content
                    if chunk:
                        full_response += chunk
                        await redis.publish(
                            f"sse:{turn_id}",
                            json.dumps({"event": "token_stream", "data": chunk}),
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

            tokens_used = cb.total_tokens
            cost_usd = cb.total_cost

        # ── 4. Budget check ──────────────────────────────────────────────
        await check_budget_and_alert("run_agent_task", cost_usd)

        # ── 5. Persist assistant response to PostgreSQL ─────────────────
        if full_response:
            await save_message(
                conversation_id, user_id, "assistant", full_response,
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
        raise
    finally:
        # Atomic lock release via Lua script — avoids race between get and delete
        await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1, stream_lock_key, turn_id,
        )


def _parse_redis_url(redis_url: str) -> dict:
    """Parse redis:// URL into RedisSettings dict for WorkerSettings."""
    from urllib.parse import urlparse
    parsed = urlparse(redis_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 6379,
        "database": int(parsed.path.lstrip("/") or 0),
    }


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [run_agent_task]
    redis_settings = _parse_redis_url(settings.redis_url)
    max_jobs = 10
    job_timeout = 300  # 5 minutes max per task

    @classmethod
    async def on_startup(cls, ctx: dict):
        ctx["redis"] = await aioredis.from_url(settings.redis_url, decode_responses=True)

    @classmethod
    async def on_shutdown(cls, ctx: dict):
        await ctx["redis"].close()