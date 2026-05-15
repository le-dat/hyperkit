# Step 03 — LangGraph Agent + 3-Tier Memory + Checkpointer

## Goal

Build the stateful AI agent core:
- `conversation_id` as LangGraph `thread_id` → AI remembers across turns
- 3-tier memory: working → summary → entity (Redis 24h)
- `SqliteSaver` in dev, `PostgresSaver` in prod (never `MemorySaver`)
- `interrupt_before=["human_gate"]` for high-risk actions
- Retry loop with attempt counter in state

> **Prerequisite**: [Step 02 — Backend Auth](./02-auth.md)

---

## File Structure

```
backend/
├── agents/
│   ├── supervisor.py    ← LangGraph StateGraph
│   └── registry.py      ← Agent factory (future: multi-agent)
└── state/
    ├── checkpoint.py    ← SqliteSaver / PostgresSaver
    └── memory.py        ← 3-tier memory helpers
```

---

## Step 2.1 — AgentState Schema

```python
# backend/agents/supervisor.py
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    # Identifiers
    conversation_id: str
    turn_id: str
    user_id: str

    # Messages (Annotated = append-only, not overwrite — avoids race conditions)
    messages: Annotated[list, operator.add]

    # Task
    task: str
    result: str

    # Control flow
    attempts: int
    confidence: float              # < 0.85 → route to human_gate
    errors: Annotated[list, operator.add]
    approved: bool
```

---

## Step 2.2 — Checkpointer

```python
# backend/state/checkpoint.py
import os
from langgraph.checkpoint.sqlite import SqliteSaver
# from langgraph.checkpoint.postgres import PostgresSaver  # prod

def get_checkpointer():
    """
    Dev:  SqliteSaver  — file-based, persists across restarts
    Prod: PostgresSaver — shared across multiple worker instances
    
    NEVER MemorySaver in production — state is gone on process restart.
    """
    if os.getenv("ENV", "development") == "production":
        # Uncomment when ready:
        # from langgraph.checkpoint.postgres import PostgresSaver
        # return PostgresSaver.from_conn_string(os.getenv("DATABASE_URL_SYNC"))
        pass
    return SqliteSaver.from_conn_string("checkpoints.db")

checkpointer = get_checkpointer()
```

---

## Step 2.3 — LangGraph Supervisor Graph

```python
# backend/agents/supervisor.py (continued)
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage

from state.checkpoint import checkpointer
from llm.router import get_llm, TaskType  # created in Step 03


def node_process(state: AgentState) -> dict:
    """Main reasoning node."""
    llm = get_llm(TaskType.REASONING)
    response = llm.invoke(state["messages"])
    return {
        "messages": [AIMessage(content=response.content)],
        "result": response.content,
        "attempts": state["attempts"] + 1,
    }


def node_human_gate(state: AgentState) -> dict:
    """Passthrough — LangGraph pauses HERE via interrupt_before."""
    return {}


def route_after_process(state: AgentState) -> str:
    if state.get("errors"):
        return "end"
    if state["confidence"] < 0.85:
        return "human_gate"        # pause, wait for human
    if state["attempts"] >= 3 and not state["result"]:
        return "end"               # max retries reached
    return "end"                   # success


# ── Build graph ────────────────────────────────────────────────────────
builder = StateGraph(AgentState)
builder.add_node("process",    node_process)
builder.add_node("human_gate", node_human_gate)

builder.set_entry_point("process")
builder.add_conditional_edges("process", route_after_process, {
    "human_gate": "human_gate",
    "end":        END,
})
builder.add_edge("human_gate", END)  # after resume → END

graph = builder.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_gate"],   # pause before high-risk
)
```

---

## Step 2.4 — Retry Loop Pattern

```python
# Pattern for nodes that can fail and retry
def node_scan(state: AgentState) -> dict:
    try:
        result = do_work(state["task"])
        return {"result": result, "attempts": state["attempts"] + 1}
    except Exception as e:
        return {"errors": [str(e)], "attempts": state["attempts"] + 1}

def route_after_scan(state: AgentState) -> str:
    if state.get("result"):
        return "analyze"           # success
    if state["attempts"] < 3:
        return "scan"              # ← loop back (retry!)
    return "report_empty"          # exhausted

builder.add_conditional_edges("scan", route_after_scan, {
    "scan":         "scan",        # ← self-loop = retry
    "analyze":      "analyze",
    "report_empty": "report",
})
```

---

## Step 2.5 — 3-Tier Memory

```python
# backend/state/memory.py
from langchain.memory import ConversationSummaryBufferMemory
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
import redis.asyncio as aioredis

# ── Tier 1: Working memory — last 5 turns from PostgreSQL ─────────────
async def get_working_memory(conversation_id: str, user_id: str) -> list:
    from db.chat_history import get_conversation_messages
    msgs = await get_conversation_messages(conversation_id, user_id, limit=5)
    return [
        HumanMessage(content=m.content) if m.role == "user"
        else AIMessage(content=m.content)
        for m in msgs
    ]


# ── Tier 2: Summary memory — auto-summarize at 800 tokens ─────────────
def make_summary_memory() -> ConversationSummaryBufferMemory:
    """Use gpt-4o-mini to summarize old context, keeping recent 800 tokens."""
    return ConversationSummaryBufferMemory(
        llm=ChatOpenAI(model="gpt-4o-mini"),
        max_token_limit=800,
        return_messages=True,
    )


# ── Tier 3: Entity memory — Redis HSET, TTL 24h ───────────────────────
async def remember_entity(redis: aioredis.Redis, conv_id: str, key: str, value: str):
    """Store key facts (vendor, invoice ID) extracted from conversation."""
    await redis.hset(f"session:{conv_id}:entities", key, value)
    await redis.expire(f"session:{conv_id}:entities", 86400)   # 24h TTL


async def recall_entity(redis: aioredis.Redis, conv_id: str, key: str) -> str | None:
    """Recall entity without user having to repeat it."""
    return await redis.hget(f"session:{conv_id}:entities", key)


async def recall_all_entities(redis: aioredis.Redis, conv_id: str) -> dict:
    return await redis.hgetall(f"session:{conv_id}:entities")
```

---

## Step 2.6 — Invoke & Resume

```python
# Invoke (start new turn)
config = {"configurable": {"thread_id": conversation_id}}
await graph.ainvoke(
    {
        "messages": history_messages + [HumanMessage(content=user_message)],
        "task": user_message,
        "conversation_id": conversation_id,
        "turn_id": turn_id,
        "user_id": user_id,
        "attempts": 0,
        "errors": [],
        "confidence": 1.0,
        "approved": False,
    },
    config=config,
)

# Resume after human approval
await graph.ainvoke(None, config=config)   # resumes from checkpoint

# Inspect state (debug / human gate UI)
state = graph.get_state(config)
print(state.values)   # current state
print(state.next)     # which nodes are pending
```

---

## Verification

```bash
python -c "
import asyncio
from langchain_core.messages import HumanMessage
from agents.supervisor import graph

async def test():
    cfg = {'configurable': {'thread_id': 'conv-test-001'}}
    result = await graph.ainvoke({
        'messages': [HumanMessage(content='Hello')],
        'task': 'Hello', 'conversation_id': 'conv-test-001',
        'turn_id': 'turn-001', 'user_id': 'u-001',
        'attempts': 0, 'errors': [], 'confidence': 1.0, 'approved': False
    }, config=cfg)
    print('Result:', result.get('result'))

asyncio.run(test())
"
# → Result: <AI response>
```

## Verification Checklist

- [ ] Graph compiles without error
- [ ] Single invoke returns a result
- [ ] Second invoke with same `thread_id` includes previous context (AI remembers)
- [ ] `checkpoints.db` created (SqliteSaver working)
- [ ] Entity memory: `remember_entity` → `recall_entity` returns the value

> ➡️ Next: [Step 04 — Worker & LLM Router](./04-worker-llm.md)
