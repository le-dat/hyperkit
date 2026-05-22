"""Agent state definition — TypedDict used across all supervisor components."""

from typing import TypedDict, Annotated
import operator


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

    # Runtime metadata
    status: str
    last_node: str