import os
import sys
from pathlib import Path

# Resolve server/ path so db.utils/core can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import redis.asyncio as aioredis

from db.chat_history import save_message
from state.memory import remember_entity
from state import (
    update_session_status,
    set_session_failed,
    set_session_complete,
)
from guards.budget import check_budget_and_alert
from core.schemas import SSEEvent, SSEEventType, SessionStatus, ArqJobName, RedisKeys
from workers.streaming import TokenBatcher
from db.utils import _utcnow
from mcp_registry.registry import registry

# Import from our modular subcomponents
from workers.task_context import TaskContext
from workers.task_memory import build_messages, extract_and_remember_entities
from workers.graph_streamer import stream_graph_events


# ==========================================
# 1. CORE LIFE-CYCLE HELPERS
# ==========================================

async def acquire_stream_lock(ctx: TaskContext) -> bool:
    """Attempt to acquire streaming deduplication lock. Returns True if acquired."""
    is_locked = await ctx.redis.set(
        ctx.stream_lock_key, ctx.turn_id, ex=30, nx=True
    )
    if not is_locked:
        await SSEEvent(
            SSEEventType.WARNING,
            {"message": "Streaming already active for this conversation"},
        ).publish(ctx.redis, ctx.sse_channel)
        await update_session_status(ctx.redis, ctx.turn_id, SessionStatus.IGNORED)
        await SSEEvent(SSEEventType.IGNORED, {}).publish(ctx.redis, ctx.sse_channel)
        return False
    return True


async def release_lock(redis: aioredis.Redis, lock_key: str, turn_id: str) -> None:
    """Atomically release the streaming lock via Lua script."""
    await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1, lock_key, turn_id,
    )


def parse_thought_tags(text: str) -> tuple[str, str]:
    """
    Parses <thought>...</thought> tags from a text string.
    Returns: (clean_text, thought_content)
    """
    clean_text = text
    thought_content = ""

    if "<thought>" in text and "</thought>" in text:
        parts = text.split("</thought>", 1)
        thought_content = parts[0].split("<thought>", 1)[-1]
        clean_text = parts[1]
    elif "<thought>" in text:
        parts = text.split("<thought>", 1)
        thought_content = parts[1]
        clean_text = parts[0]

    return clean_text, thought_content


async def recover_and_finalize(ctx: TaskContext) -> None:
    """Check for task failure, recover state from checkpointer, extract final response."""
    from agents import graph
    from agents.nodes import MAX_ATTEMPTS

    config = {"configurable": {"thread_id": ctx.conversation_id}}
    state_snapshot = await graph.aget_state(config)
    final_state = state_snapshot.values if state_snapshot else {}

    errors = final_state.get("errors", [])
    attempts = final_state.get("attempts", 0)
    if errors and attempts >= MAX_ATTEMPTS:
        raise RuntimeError(f"Agent reasoning failed: {errors[0]}")

    if not ctx.full_response:
        final_result = final_state.get("result", "")
        if final_result:
            ctx.full_response = final_result
        else:
            messages_list = final_state.get("messages", [])
            if messages_list and hasattr(messages_list[-1], "content") and messages_list[-1].content:
                ctx.full_response = messages_list[-1].content

    # Extract thoughts and clean response text using helper
    clean_text, thought_part = parse_thought_tags(ctx.full_response)
    if thought_part and not ctx.full_thoughts:
        ctx.full_thoughts = thought_part
    ctx.full_response = clean_text


async def persist_result(ctx: TaskContext) -> None:
    """Save assistant response to PostgreSQL and extract entities to Tier 3 memory."""
    if ctx.full_response:
        await save_message(
            ctx.conversation_id, ctx.user_id, "assistant", ctx.full_response,
            thoughts=ctx.full_thoughts or None,
            tokens_used=ctx.tokens_used, cost_usd=ctx.cost_usd,
        )

    await remember_entity(
        ctx.redis, ctx.conversation_id, "last_response", ctx.full_response[:200],
    )

    await extract_and_remember_entities(ctx)


async def signal_completion(ctx: TaskContext) -> None:
    """Publish completion event and update Redis session status."""
    await SSEEvent(
        SSEEventType.AGENT_COMPLETE,
        {"tokens": ctx.tokens_used, "cost_usd": ctx.cost_usd},
    ).publish(ctx.redis, ctx.sse_channel)
    await set_session_complete(ctx.redis, ctx.turn_id, ctx.full_response)


async def handle_error(ctx: TaskContext, error: Exception) -> None:
    """Publish error event and save error messages to history."""
    await SSEEvent(
        SSEEventType.ERROR,
        {"message": str(error)},
    ).publish(ctx.redis, ctx.sse_channel)
    await set_session_failed(ctx.redis, ctx.turn_id, str(error))

    error_content = f"Error: {str(error)}"
    try:
        await save_message(
            ctx.conversation_id, ctx.user_id, "user", ctx.message,
            tokens_used=0, cost_usd=0.0,
        )
        await save_message(
            ctx.conversation_id, ctx.user_id, "assistant", error_content,
            tokens_used=0, cost_usd=0.0,
        )
    except Exception:
        pass


# ==========================================
# 2. ENTRY POINTS / ARQ TASK FUNCTIONS
# ==========================================

async def run_agent_task(
    ctx: dict,
    *,
    turn_id: str,
    conversation_id: str,
    user_id: str,
    message: str,
):
    """
    ARQ task entry point — runs LangGraph agent, streams events to Redis PubSub.
    """
    task_ctx = TaskContext(
        redis=ctx["redis"],
        turn_id=turn_id,
        conversation_id=conversation_id,
        user_id=user_id,
        message=message,
        stream_lock_key=RedisKeys.lock_stream(conversation_id),
    )

    await update_session_status(task_ctx.redis, task_ctx.turn_id, SessionStatus.RUNNING)
    await task_ctx.redis.hset(RedisKeys.session(task_ctx.turn_id), "started_at", _utcnow().isoformat())

    try:
        if not await acquire_stream_lock(task_ctx):
            await update_session_status(task_ctx.redis, task_ctx.turn_id, SessionStatus.IGNORED)
            return

        messages = await build_messages(task_ctx)
        flow = await stream_graph_events(task_ctx, messages)

        if flow == "cancelled":
            await registry.close_all_sessions()
            return
        if flow == "awaiting_approval":
            return

        await check_budget_and_alert(ArqJobName.RUN_AGENT_TASK, task_ctx.cost_usd)
        await recover_and_finalize(task_ctx)
        await persist_result(task_ctx)
        await signal_completion(task_ctx)

    except Exception as e:
        await handle_error(task_ctx, e)
        raise

    finally:
        await release_lock(task_ctx.redis, task_ctx.stream_lock_key, task_ctx.turn_id)


async def resume_agent_task(
    ctx: dict,
    *,
    turn_id: str,
    conversation_id: str,
    user_id: str,
):
    """
    ARQ task entry point — resumes a human-gate-interrupted graph and
    re-streams the response to SSE.

    Called after user approves via POST /agent/{turn_id}/approve.
    The original task already returned 'awaiting_approval' and closed its
    SSE stream, so a fresh run is needed to publish the final response.
    """
    from agents import graph as agent_graph

    redis = ctx["redis"]
    stream_lock_key = RedisKeys.lock_stream(conversation_id)
    stream_lock_acquired = await redis.set(stream_lock_key, turn_id, ex=30, nx=True)
    if not stream_lock_acquired:
        await update_session_status(redis, turn_id, SessionStatus.IGNORED)
        return

    try:
        await update_session_status(redis, turn_id, SessionStatus.RUNNING)

        config = {"configurable": {"thread_id": conversation_id}}
        state_snapshot = await agent_graph.aget_state(config)
        if not state_snapshot or not state_snapshot.values:
            await SSEEvent(
                SSEEventType.ERROR,
                {"message": "Could not retrieve checkpointed state for resume"},
            ).publish(redis, RedisKeys.sse_channel(turn_id))
            await update_session_status(redis, turn_id, SessionStatus.FAILED)
            return

        messages_list = state_snapshot.values.get("messages", [])
        full_response = state_snapshot.values.get("result", "")

        if not full_response and messages_list:
            last_msg = messages_list[-1]
            if hasattr(last_msg, "content") and last_msg.content:
                full_response = last_msg.content

        # Re-use our parsed thought helper
        clean_text, full_thoughts = parse_thought_tags(full_response)
        full_response = clean_text

        batcher = TokenBatcher(redis, RedisKeys.sse_channel(turn_id))

        if full_thoughts:
            await batcher.add_thought(full_thoughts)
        if full_response:
            await batcher.add_token(full_response)
        await batcher.flush()

        tokens_used = 0
        cost_usd = 0.0

        if full_response:
            await save_message(
                conversation_id, user_id, "assistant", full_response,
                thoughts=full_thoughts or None,
                tokens_used=tokens_used, cost_usd=cost_usd,
            )

        await SSEEvent(
            SSEEventType.AGENT_COMPLETE,
            {"tokens": tokens_used, "cost_usd": cost_usd},
        ).publish(redis, RedisKeys.sse_channel(turn_id))
        await update_session_status(redis, turn_id, SessionStatus.COMPLETE)

    except Exception as e:
        await SSEEvent(
            SSEEventType.ERROR,
            {"message": f"Resume failed: {str(e)}"},
        ).publish(redis, RedisKeys.sse_channel(turn_id))
        await update_session_status(redis, turn_id, SessionStatus.FAILED)
        raise

    finally:
        # Re-use our generic release_lock helper!
        await release_lock(redis, stream_lock_key, turn_id)