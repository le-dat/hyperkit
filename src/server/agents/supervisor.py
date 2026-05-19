"""LangGraph supervisor graph with AgentState and human-in-the-loop gating."""

from typing import TypedDict, Annotated
import operator
import os

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.tools import StructuredTool
from langgraph.graph import StateGraph, END

from state.checkpoint import checkpointer
from llm.router import get_llm, TaskType

# Configurable retry limit — can be overridden via environment variable
MAX_ATTEMPTS = int(os.getenv("AGENT_MAX_ATTEMPTS", "3"))

# Global MCP tools cache — built once at startup via build_mcp_tools()
_mcp_tools_cache: list[StructuredTool] | None = None


class AgentState(TypedDict):
    # Identifiers
    conversation_id: str
    turn_id: str
    user_id: str

    # Messages (Annotated = append-only, avoids race conditions)
    messages: Annotated[list, operator.add]

    # Task
    task: str
    result: str

    # Control flow
    attempts: int
    errors: list[str]
    approved: bool


async def node_process(state: AgentState) -> dict:
    """Main reasoning node — calls LLM with bound MCP tools and returns AI response."""
    try:
        llm = get_llm(TaskType.REASONING)
        if _mcp_tools_cache is not None:
            llm = llm.bind_tools(_mcp_tools_cache)
        
        system_msg = SystemMessage(
            content=(
                "Prior to writing your final response, you MUST output your step-by-step thinking process, search strategy, and planning inside <thought>...</thought> tags at the very beginning of your output. Once done, close the tag and write your final user-facing response."
            )
        )
        messages_to_send = [system_msg] + state["messages"]
        
        full_content = ""
        # Consume the stream to trigger on_chat_model_stream events
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
        }
    except Exception as e:
        print(f"[Supervisor Error] node_process failed: {e}", flush=True)
        import traceback
        traceback.print_exc()
        
        prior = state.get("errors", [])
        errors = [str(e)] + prior
        errors = errors[:3]
        return {
            "errors": errors,
            "attempts": min(state.get("attempts", 0) + 1, MAX_ATTEMPTS),
        }


def node_human_gate(state: AgentState) -> dict:
    """Human approval node — marks conversation as approved on resume."""
    return {"approved": True}


def route_after_process(state: AgentState) -> str:
    """Route based on state after process node runs."""
    if state.get("errors"):
        if state.get("attempts", 0) >= MAX_ATTEMPTS:
            return "end"
        return "process"
    if not state.get("approved", False):
        return "human_gate"
    return "end"


# ── Build graph ────────────────────────────────────────────────────────

builder = StateGraph(AgentState)
builder.add_node("process", node_process)
builder.add_node("human_gate", node_human_gate)

builder.set_entry_point("process")
builder.add_conditional_edges(
    "process",
    route_after_process,
    {
        "process": "process",
        "human_gate": "human_gate",
        "end": END,
    },
)
builder.add_edge("human_gate", END)

graph = builder.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_gate"],
)


# ── MCP tool builder — call once at startup ────────────────────────────


async def build_mcp_tools() -> list[StructuredTool]:
    """Discover all tools from registered MCP servers and wrap them as StructuredTools."""
    from mcp_registry.registry import registry

    mcp_tools_list = await registry.all_tools()
    result: list[StructuredTool] = []
    for td in mcp_tools_list:
        server = td["_server"]
        name = td["name"]
        description = td.get("description", "")

        # Capture server/name via default args to avoid late-binding closure bugs
        async def call(server_: str = server, name_: str = name, **kwargs) -> str:
            r = await registry.call_tool(server_, name_, kwargs)
            content = r.get("content", "")
            if r.get("is_error"):
                raise RuntimeError(f"MCP tool error: {content}")
            return content

        result.append(StructuredTool.from_function(
            coroutine=call,
            name=name,
            description=description,
        ))
    return result


def set_mcp_tools(tools: list[StructuredTool]) -> None:
    """Store globally so sync node_process can access them."""
    global _mcp_tools_cache
    _mcp_tools_cache = tools