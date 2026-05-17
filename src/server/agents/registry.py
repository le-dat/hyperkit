"""Agent registry — factory for multi-tenant agent isolation."""

from state.checkpoint import checkpointer


def create_agent():
    """
    Return a new compiled agent graph using the shared checkpointer.

    The checkpointer (PostgresSaver or InMemorySaver) is a process-wide
    singleton. Each call produces a fresh graph instance so that concurrent
    tenants do not share graph internals, while the checkpointer itself
    is thread-safe and reuses its connection pool.
    """
    from agents.supervisor import builder

    return builder.compile(checkpointer=checkpointer), checkpointer