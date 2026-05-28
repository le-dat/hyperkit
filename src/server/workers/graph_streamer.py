import sys
from pathlib import Path

# Resolve server/ path so db, core, and state can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from typing import Any, Literal
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.callbacks import get_openai_callback

from db.chat_history import save_message
from state import (
    update_session_status,
    set_session_awaiting_approval,
)
from core.schemas import SSEEvent, SSEEventType, SessionStatus, RedisKeys
from workers.task_context import TaskContext


def _extract_text_and_thinking_from_chunk(chunk: Any) -> tuple[str, str]:
    """
    Extracts plain text and explicit thinking blocks from a LangChain stream chunk content.
    Returns: (text_chunk, thinking_chunk)
    """
    text_chunk = ""
    thinking_chunk = ""

    if not chunk:
        return text_chunk, thinking_chunk

    if isinstance(chunk, list):
        for block in chunk:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    text_chunk += block.get("text", "")
                elif block.get("type") == "thinking":
                    thinking_chunk += block.get("thinking", "")
            elif isinstance(block, str):
                text_chunk += block
    elif isinstance(chunk, str):
        text_chunk = chunk
    else:
        text_chunk = str(chunk)

    return text_chunk, thinking_chunk


async def _handle_stream_event(ctx: TaskContext, event: dict) -> None:
    """Handle on_chat_model_stream event — parse tokens and thoughts."""
    chunk = event["data"]["chunk"].content
    text_chunk, thinking_chunk = _extract_text_and_thinking_from_chunk(chunk)

    if thinking_chunk:
        ctx.full_thoughts += thinking_chunk
        await SSEEvent(
            SSEEventType.THOUGHT_STREAM, {"delta": thinking_chunk}
        ).publish(ctx.redis, ctx.sse_channel)

    if text_chunk:
        parsed_events = ctx.parser.feed(text_chunk)
        for pevent_type, pdata in parsed_events:
            if pevent_type == SSEEventType.THOUGHT_STREAM:
                ctx.full_thoughts += pdata
                await ctx.batcher.add_thought(pdata)
            else:
                ctx.full_response += pdata
                await ctx.batcher.add_token(pdata)


async def _on_chat_model_stream(ctx: TaskContext, event: dict) -> None:
    """Handle model stream tokens and thoughts."""
    await _handle_stream_event(ctx, event)


async def _on_tool_start(ctx: TaskContext, event: dict) -> None:
    """Handle tool startup event."""
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
    ).publish(ctx.redis, ctx.sse_channel)


async def _on_tool_end(ctx: TaskContext, event: dict) -> None:
    """Handle tool completion event."""
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
    ).publish(ctx.redis, ctx.sse_channel)


async def _on_chain_start(ctx: TaskContext, event: dict) -> None:
    """Handle chain start event for specific core nodes."""
    if event.get("name") in ("process", "human_gate"):
        await ctx.batcher.flush()
        await SSEEvent(
            SSEEventType.NODE_START,
            {"node": event.get("name", "")},
        ).publish(ctx.redis, ctx.sse_channel)


async def _on_chain_end_interrupted(ctx: TaskContext) -> None:
    """Handle chain end event when human gate is hit."""
    await SSEEvent(
        SSEEventType.HUMAN_GATE_AWAITING,
        {"turn_id": ctx.turn_id, "message": "Awaiting approval"},
    ).publish(ctx.redis, ctx.sse_channel)
    await set_session_awaiting_approval(ctx.redis, ctx.turn_id, "human_gate")


# Dispatch dictionary mapping LangGraph event names to handler functions
_EVENT_HANDLERS = {
    "on_chat_model_stream": _on_chat_model_stream,
    "on_tool_start": _on_tool_start,
    "on_tool_end": _on_tool_end,
    "on_chain_start": _on_chain_start,
}


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
            # Check for user cancellation
            if await ctx.redis.exists(RedisKeys.cancel(ctx.turn_id)):
                ctx.tokens_used = cb.total_tokens
                ctx.cost_usd = cb.total_cost
                await ctx.batcher.flush()
                await SSEEvent(
                    SSEEventType.CANCELLED,
                    {"message": "Task cancelled by user"},
                ).publish(ctx.redis, ctx.sse_channel)
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

            # Dispatch event handler
            if etype in _EVENT_HANDLERS:
                await _EVENT_HANDLERS[etype](ctx, event)
            elif "human_gate" in event.get("name", "") and etype == "on_chain_end":
                ctx.tokens_used = cb.total_tokens
                ctx.cost_usd = cb.total_cost
                await _on_chain_end_interrupted(ctx)
                return "awaiting_approval"

        # Stream cleanup and final flushes
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

    # Fallback to checkpoint inspection to guard against edge cases in interrupt detection
    from agents import graph as agent_graph

    config = {"configurable": {"thread_id": ctx.conversation_id}}
    snapshot = await agent_graph.aget_state(config)
    if snapshot and snapshot.values:
        status = snapshot.values.get("status", "")
        if status == SessionStatus.AWAITING_APPROVAL:
            await _on_chain_end_interrupted(ctx)
            return "awaiting_approval"

    return "complete"
