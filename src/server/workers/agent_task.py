"""Agent task logic — split into composable phase functions."""

import os
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Literal

# Resolve server/ path so db.utils can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import redis.asyncio as aioredis
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.callbacks import get_openai_callback

from db.chat_history import save_message, get_conversation_messages
from state.memory import remember_entity
from state import (
    update_session_status,
    set_session_failed,
    set_session_awaiting_approval,
    set_session_complete,
)
from guards.budget import check_budget_and_alert
from core.schemas import SSEEvent, SSEEventType, SessionStatus
from workers.streaming import TokenBatcher, StreamThoughtParser
from db.utils import _utcnow

WORKING_MEMORY_LIMIT = int(os.getenv("WORKING_MEMORY_LIMIT", "5"))


@dataclass
class TaskContext:
    """Bundled context for a single agent task run."""
    redis: aioredis.Redis
    turn_id: str
    conversation_id: str
    user_id: str
    message: str
    stream_lock_key: str
    batcher: TokenBatcher = field(init=False)
    parser: StreamThoughtParser = field(init=False)
    full_response: str = ""
    full_thoughts: str = ""
    tokens_used: int = 0
    cost_usd: float = 0.0

    def __post_init__(self):
        self.batcher = TokenBatcher(self.redis, f"sse:{self.turn_id}")
        self.parser = StreamThoughtParser()


async def acquire_stream_lock(ctx: TaskContext) -> bool:
    """Attempt to acquire streaming deduplication lock. Returns True if acquired."""
    is_locked = await ctx.redis.set(
        ctx.stream_lock_key, ctx.turn_id, ex=30, nx=True
    )
    if not is_locked:
        await SSEEvent(
            SSEEventType.WARNING,
            {"message": "Streaming already active for this conversation"},
        ).publish(ctx.redis, f"sse:{ctx.turn_id}")
        await update_session_status(ctx.redis, ctx.turn_id, SessionStatus.IGNORED)
        await SSEEvent(SSEEventType.IGNORED, {}).publish(ctx.redis, f"sse:{ctx.turn_id}")
        return False
    return True


async def build_messages(ctx: TaskContext) -> list[HumanMessage | AIMessage]:
    """Load conversation history and append the new user message."""
    history_rows = await get_conversation_messages(
        ctx.conversation_id, ctx.user_id, limit=WORKING_MEMORY_LIMIT
    )
    messages = [
        HumanMessage(content=r.content) if r.role == "user" else AIMessage(content=r.content)
        for r in history_rows
    ]
    messages.append(HumanMessage(content=ctx.message))
    return messages


async def _handle_stream_event(ctx: TaskContext, event: dict) -> None:
    """Handle on_chat_model_stream event — parse tokens and thoughts."""
    chunk = event["data"]["chunk"].content
    if not chunk:
        return

    text_chunk = ""
    if isinstance(chunk, list):
        for block in chunk:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    text_chunk += block.get("text", "")
                elif block.get("type") == "thinking":
                    thinking_content = block.get("thinking", "")
                    if thinking_content:
                        ctx.full_thoughts += thinking_content
                        await SSEEvent(
                            SSEEventType.THOUGHT_STREAM, thinking_content
                        ).publish(ctx.redis, f"sse:{ctx.turn_id}")
            elif isinstance(block, str):
                text_chunk += block
    elif isinstance(chunk, str):
        text_chunk = chunk
    else:
        text_chunk = str(chunk)

    if text_chunk:
        parsed_events = ctx.parser.feed(text_chunk)
        for pevent_type, pdata in parsed_events:
            if pevent_type == SSEEventType.THOUGHT_STREAM:
                ctx.full_thoughts += pdata
                await ctx.batcher.add_thought(pdata)
            else:
                ctx.full_response += pdata
                await ctx.batcher.add_token(pdata)


async def stream_graph_events(
    ctx: TaskContext,
    messages: list[HumanMessage | AIMessage],
) -> Literal["cancelled", "awaiting_approval", "complete"]:
    """
    Run graph.astream_events and stream tokens to Redis PubSub.
    Returns: "cancelled" | "awaiting_approval" | "complete"
    """
    from agents import graph

    config = {"configurable": {"thread_id": ctx.conversation_id}}

    with get_openai_callback() as cb:
        async for event in graph.astream_events(
            {
                "messages": messages,
                "task": ctx.message,
                "conversation_id": ctx.conversation_id,
                "turn_id": ctx.turn_id,
                "user_id": ctx.user_id,
                "attempts": 0,
                "errors": [],
                "approved": False,
            },
            config=config,
            version="v2",
        ):
            if await ctx.redis.exists(f"cancel:{ctx.turn_id}"):
                ctx.tokens_used = cb.total_tokens
                ctx.cost_usd = cb.total_cost
                await ctx.batcher.flush()
                await SSEEvent(
                    SSEEventType.CANCELLED,
                    {"message": "Task cancelled by user"},
                ).publish(ctx.redis, f"sse:{ctx.turn_id}")
                await update_session_status(ctx.redis, ctx.turn_id, SessionStatus.CANCELLED)
                try:
                    await save_message(
                        ctx.conversation_id, ctx.user_id, "user", ctx.message,
                        tokens_used=ctx.tokens_used, cost_usd=ctx.cost_usd,
                    )
                except Exception:
                    pass
                return "cancelled"

            etype = event["event"]

            if etype == "on_chat_model_stream":
                await _handle_stream_event(ctx, event)

            elif etype == "on_tool_start":
                await ctx.batcher.flush()
                tool_name = event["name"]
                tool_input = event["data"].get("input", "")
                await SSEEvent(
                    SSEEventType.AGENT_THINKING,
                    {
                        "step": "start",
                        "tool": tool_name,
                        "input": tool_input,
                        "status": f"Running tool: {tool_name}...",
                    },
                ).publish(ctx.redis, f"sse:{ctx.turn_id}")

            elif etype == "on_tool_end":
                await ctx.batcher.flush()
                tool_name = event["name"]
                tool_output = event["data"].get("output", "")
                str_output = str(tool_output)
                truncated = str_output[:1000] + "..." if len(str_output) > 1000 else str_output
                await SSEEvent(
                    SSEEventType.AGENT_THINKING,
                    {
                        "step": "end",
                        "tool": tool_name,
                        "output": truncated,
                        "status": f"Completed tool: {tool_name}",
                    },
                ).publish(ctx.redis, f"sse:{ctx.turn_id}")

            elif etype == "on_chain_start" and event.get("name") in ("process", "human_gate"):
                await ctx.batcher.flush()
                await SSEEvent(
                    SSEEventType.NODE_START,
                    {"node": event.get("name", "")},
                ).publish(ctx.redis, f"sse:{ctx.turn_id}")

            elif "human_gate" in event.get("name", "") and etype == "on_chain_end":
                ctx.tokens_used = cb.total_tokens
                ctx.cost_usd = cb.total_cost
                await SSEEvent(
                    SSEEventType.HUMAN_GATE_AWAITING,
                    {"turn_id": ctx.turn_id, "message": "Awaiting approval"},
                ).publish(ctx.redis, f"sse:{ctx.turn_id}")
                await set_session_awaiting_approval(ctx.redis, ctx.turn_id, "human_gate")
                return "awaiting_approval"

        await ctx.batcher.flush()
        for pevent_type, pdata in ctx.parser.flush():
            if pevent_type == SSEEventType.THOUGHT_STREAM:
                ctx.full_thoughts += pdata
                await ctx.batcher.add_thought(pdata)
            else:
                ctx.full_response += pdata
                await ctx.batcher.add_token(pdata)
        await ctx.batcher.flush()

        ctx.tokens_used = cb.total_tokens
        ctx.cost_usd = cb.total_cost

    # Guard against astream_events not triggering on_chain_end for the
    # interrupt (interrupt_before with version="v2" has edge cases).
    # Fall back to checkpoint inspection: if status is AWAITING_APPROVAL
    # the graph was interrupted and we should treat it as such.
    from agents import graph as agent_graph

    config = {"configurable": {"thread_id": ctx.conversation_id}}
    snapshot = await agent_graph.aget_state(config)
    if snapshot and snapshot.values:
        status = snapshot.values.get("status", "")
        if status == SessionStatus.AWAITING_APPROVAL:
            await SSEEvent(
                SSEEventType.HUMAN_GATE_AWAITING,
                {"turn_id": ctx.turn_id, "message": "Awaiting approval"},
            ).publish(ctx.redis, f"sse:{ctx.turn_id}")
            await set_session_awaiting_approval(ctx.redis, ctx.turn_id, "human_gate")
            return "awaiting_approval"

    return "complete"


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

    if "<thought>" in ctx.full_response and "</thought>" in ctx.full_response:
        parts = ctx.full_response.split("</thought>", 1)
        thought_part = parts[0].split("<thought>", 1)[-1]
        if not ctx.full_thoughts:
            ctx.full_thoughts = thought_part
        ctx.full_response = parts[1]
    elif "<thought>" in ctx.full_response:
        parts = ctx.full_response.split("<thought>", 1)
        if not ctx.full_thoughts:
            ctx.full_thoughts = parts[1]
        ctx.full_response = parts[0]


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


async def signal_completion(ctx: TaskContext) -> None:
    """Publish completion event and update Redis session status."""
    await SSEEvent(
        SSEEventType.AGENT_COMPLETE,
        {"tokens": ctx.tokens_used, "cost_usd": ctx.cost_usd},
    ).publish(ctx.redis, f"sse:{ctx.turn_id}")
    await set_session_complete(ctx.redis, ctx.turn_id, ctx.full_response)


async def handle_error(ctx: TaskContext, error: Exception) -> None:
    """Publish error event and save error messages to history."""
    await SSEEvent(
        SSEEventType.ERROR,
        {"message": str(error)},
    ).publish(ctx.redis, f"sse:{ctx.turn_id}")
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


async def release_lock(ctx: TaskContext) -> None:
    """Atomically release the streaming lock via Lua script."""
    await ctx.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1, ctx.stream_lock_key, ctx.turn_id,
    )


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
        stream_lock_key=f"lock:stream:{conversation_id}",
    )

    await update_session_status(task_ctx.redis, task_ctx.turn_id, SessionStatus.RUNNING)
    await task_ctx.redis.hset(f"session:{task_ctx.turn_id}", "started_at", _utcnow().isoformat())

    try:
        if not await acquire_stream_lock(task_ctx):
            await update_session_status(task_ctx.redis, task_ctx.turn_id, SessionStatus.IGNORED)
            return

        messages = await build_messages(task_ctx)
        flow = await stream_graph_events(task_ctx, messages)

        if flow == "cancelled":
            return
        if flow == "awaiting_approval":
            return

        await check_budget_and_alert("run_agent_task", task_ctx.cost_usd)
        await recover_and_finalize(task_ctx)
        await persist_result(task_ctx)
        await signal_completion(task_ctx)

    except Exception as e:
        await handle_error(task_ctx, e)
        raise

    finally:
        await release_lock(task_ctx)


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
    stream_lock_key = f"lock:stream:{conversation_id}"
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
            ).publish(redis, f"sse:{turn_id}")
            await update_session_status(redis, turn_id, SessionStatus.FAILED)
            return

        messages_list = state_snapshot.values.get("messages", [])
        full_response = state_snapshot.values.get("result", "")
        full_thoughts = ""

        if not full_response and messages_list:
            last_msg = messages_list[-1]
            if hasattr(last_msg, "content") and last_msg.content:
                full_response = last_msg.content

        if "<thought>" in full_response and "</thought>" in full_response:
            parts = full_response.split("</thought>", 1)
            full_thoughts = parts[0].split("<thought>", 1)[-1]
            full_response = parts[1]
        elif "<thought>" in full_response:
            parts = full_response.split("<thought>", 1)
            full_thoughts = parts[1]
            full_response = parts[0]

        batcher = TokenBatcher(redis, f"sse:{turn_id}")

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
        ).publish(redis, f"sse:{turn_id}")
        await update_session_status(redis, turn_id, SessionStatus.COMPLETE)

    except Exception as e:
        await SSEEvent(
            SSEEventType.ERROR,
            {"message": f"Resume failed: {str(e)}"},
        ).publish(redis, f"sse:{turn_id}")
        await update_session_status(redis, turn_id, SessionStatus.FAILED)
        raise

    finally:
        # Release stream lock using Lua script (same pattern as release_lock)
        await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1, stream_lock_key, turn_id,
        )