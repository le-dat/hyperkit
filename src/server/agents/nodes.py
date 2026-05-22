"""LangGraph node functions — process, human_gate, and routing logic."""

import os
import structlog

from langchain_core.messages import AIMessage, SystemMessage

from core.schemas import SessionStatus
from agents.state import AgentState
from agents.mcp_tools import get_mcp_tools_cache
from agents.user_mcp_tools import get_user_mcp_tools
from llm.router import get_llm, TaskType

logger = structlog.get_logger(__name__)

MAX_ATTEMPTS = int(os.getenv("AGENT_MAX_ATTEMPTS", "3"))


async def node_process(state: AgentState) -> dict:
    """Main reasoning node — calls LLM with bound MCP tools and returns AI response."""
    try:
        llm = get_llm(TaskType.REASONING)

        all_tools = []
        cached_tools = get_mcp_tools_cache()
        if cached_tools is not None:
            all_tools.extend(cached_tools)

        user_id = state.get("user_id")
        if user_id:
            user_tools = await get_user_mcp_tools(user_id)
            all_tools.extend(user_tools)

        if all_tools:
            llm = llm.bind_tools(all_tools)

        system_msg = SystemMessage(
            content=(
                "Prior to writing your final response, you MUST output your step-by-step thinking process, search strategy, and planning inside <thought>...</thought> tags at the very beginning of your output. Once done, close the tag and write your final user-facing response."
            )
        )
        messages_to_send = [system_msg] + state["messages"]

        full_content = ""
        async for chunk in llm.astream(messages_to_send):
            if chunk.content:
                if isinstance(chunk.content, list):
                    for block in chunk.content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            full_content += block.get("text", "")
                        elif isinstance(block, str):
                            full_content += block
                elif isinstance(chunk.content, str):
                    full_content += chunk.content
                else:
                    full_content += str(chunk.content)

        return {
            "messages": [AIMessage(content=full_content)],
            "result": full_content,
            "errors": [],
            "status": SessionStatus.COMPLETE,
            "last_node": "process",
        }
    except Exception as e:
        logger.error("supervisor_node_process_failed", error=str(e))
        import traceback
        traceback.print_exc()

        prior = state.get("errors", [])
        errors = [str(e)] + prior
        errors = errors[:3]
        return {
            "errors": errors,
            "attempts": min(state.get("attempts", 0) + 1, MAX_ATTEMPTS),
            "status": SessionStatus.FAILED,
            "last_node": "process",
        }


def node_human_gate(state: AgentState) -> dict:
    """Human approval node — marks conversation as approved on resume."""
    return {"approved": True, "status": SessionStatus.AWAITING_APPROVAL, "last_node": "human_gate"}


def route_after_process(state: AgentState) -> str:
    """Route based on state after process node runs."""
    if state.get("errors"):
        if state.get("attempts", 0) >= MAX_ATTEMPTS:
            return "end"
        return "process"
    if not state.get("approved", False):
        return "human_gate"
    return "end"