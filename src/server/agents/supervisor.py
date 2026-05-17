"""LangGraph supervisor graph with AgentState and human-in-the-loop gating."""

from typing import TypedDict, Annotated
import operator
import os

from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END

from state.checkpoint import checkpointer
from llm.router import get_llm, TaskType

# Configurable retry limit — can be overridden via environment variable
MAX_ATTEMPTS = int(os.getenv("AGENT_MAX_ATTEMPTS", "3"))


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


def node_process(state: AgentState) -> dict:
    """Main reasoning node — calls LLM and returns AI response."""
    try:
        llm = get_llm(TaskType.REASONING)
        response = llm.invoke(state["messages"])
        if not hasattr(response, "content"):
            raise TypeError(f"LLM response missing 'content' attribute: {type(response)}")
        return {
            "messages": [AIMessage(content=response.content)],
            "result": response.content,
            "errors": [],  # clear any prior errors on success
        }
    except Exception as e:
        # Cap errors at last 3 to prevent unbounded growth in long conversations
        prior = state.get("errors", [])
        errors = [str(e)] + prior
        errors = errors[:3]
        return {
            "errors": errors,
            "attempts": state.get("attempts", 0) + 1,
        }


def node_human_gate(state: AgentState) -> dict:
    """Human approval node — marks conversation as approved on resume."""
    # When the graph is resumed after human approval, approved will be True.
    # If the graph is interrupted here, the human reviews and hits "approve"
    # which causes the worker to re-invoke with approved=True.
    return {"approved": True}


def route_after_process(state: AgentState) -> str:
    """Route based on state after process node runs."""
    if state.get("errors"):
        # LLM call failed — retry up to MAX_ATTEMPTS, then give up
        if state.get("attempts", 0) >= MAX_ATTEMPTS:
            return "end"
        return "process"  # loop back and retry
    if not state.get("approved", False):
        # Not yet approved — interrupt at human_gate for human review.
        return "human_gate"
    # All checks passed — respond to user
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
        "process": "process",   # retry loop
        "human_gate": "human_gate",  # requires human approval
        "end": END,
    },
)
builder.add_edge("human_gate", END)

graph = builder.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_gate"],
)