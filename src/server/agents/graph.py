"""LangGraph supervisor graph — compiled StateGraph with human-in-the-loop gating."""

from langchain_core.messages import AIMessage
from langgraph.graph import StateGraph, END

from agents.state import AgentState
from agents.nodes import node_process, node_human_gate, node_tools, route_after_process
from state.checkpoint import checkpointer

builder = StateGraph(AgentState)
builder.add_node("process", node_process)
builder.add_node("tools", node_tools)
builder.add_node("human_gate", node_human_gate)

builder.set_entry_point("process")
builder.add_conditional_edges(
    "process",
    route_after_process,
    {
        "process": "process",
        "tools": "tools",
        "human_gate": "human_gate",
        "end": END,
    },
)
builder.add_edge("tools", "process")
builder.add_edge("human_gate", END)

graph = builder.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_gate"],
)