# Step 04 — ARQ Worker + Multi-LLM Router + Agent Endpoints

## Goal

- **Multi-LLM Router**: route task type → cheapest/best model + fallback chain
- **ARQ Worker**: async Redis queue that runs LangGraph + bridges SSE events
- **Agent Router**: `POST /agent/invoke`, `POST /agent/{id}/approve`, `GET /agent/{id}/state`

> **Prerequisite**: [Step 03 — LangGraph Agent](./03-langgraph-agent.md)

---

## File Structure

```
ai-server/
├── llm/
│   └── router.py            ← Multi-LLM routing + fallback
├── workers/
│   └── agent_worker.py      ← ARQ worker task
└── routers/
    └── agent.py             ← FastAPI endpoints
```

---

## Step 4.1 — Multi-LLM Router

```python
# ai-server/llm/router.py
import os
from enum import Enum
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

class TaskType(Enum):
    EXTRACTION = "extraction"   # cheap, fast — temp=0, gpt-4o-mini
    PLANNING   = "planning"     # smart — temp=0.1, gpt-4o
    REASONING  = "reasoning"    # smart — temp=0.3, gpt-4o
    CREATIVE   = "creative"     # creative — temp=0.7

# Cost routing guide:
# EXTRACTION → gpt-4o-mini  ($0.15/1M tokens)   — structured output, temp=0
# REASONING  → gpt-4o        ($2.50/1M tokens)   — multi-step reasoning
# On-premise → vLLM local    (free)              — air-gapped deployments

LLM_REGISTRY = {
    "openai": {
        TaskType.EXTRACTION: ChatOpenAI(model="gpt-4o-mini", temperature=0),
        TaskType.PLANNING:   ChatOpenAI(model="gpt-4o",      temperature=0.1),
        TaskType.REASONING:  ChatOpenAI(model="gpt-4o",      temperature=0.3),
        TaskType.CREATIVE:   ChatOpenAI(model="gpt-4o",      temperature=0.7),
    },
    "anthropic": {
        TaskType.EXTRACTION: ChatAnthropic(model="claude-3-haiku-20240307"),
        TaskType.PLANNING:   ChatAnthropic(model="claude-3-5-sonnet-20241022"),
        TaskType.REASONING:  ChatAnthropic(model="claude-3-5-sonnet-20241022"),
    },
    # On-premise: vLLM with OpenAI-compatible API — only swap base_url
    "local": {
        TaskType.EXTRACTION: ChatOpenAI(
            model="deepseek-r1-7b",
            openai_api_key="not-needed",
            openai_api_base=os.getenv("VLLM_BASE_URL", "http://localhost:8080/v1"),
            temperature=0,
        ),
        TaskType.REASONING: ChatOpenAI(
            model="deepseek-r1-32b",
            openai_api_key="not-needed",
            openai_api_base=os.getenv("VLLM_BASE_URL", "http://localhost:8080/v1"),
            temperature=0.3,
        ),
    },
}


def get_llm(task: TaskType, provider: str = None):
    """
    Get LLM with automatic fallback chain.
    Switch provider via LLM_PROVIDER env var — no code change needed.
    On-premise: set LLM_PROVIDER=local + VLLM_BASE_URL.
    """
    provider = provider or os.getenv("LLM_PROVIDER", "openai")

    if provider not in LLM_REGISTRY or task not in LLM_REGISTRY[provider]:
        provider = "openai"

    primary = LLM_REGISTRY[provider][task]
    fallbacks = [
        LLM_REGISTRY[p][task]
        for p in LLM_REGISTRY
        if p != provider and task in LLM_REGISTRY[p]
    ]
    return primary.with_fallbacks(fallbacks) if fallbacks else primary
```

---

## Step 4.2 — ARQ Worker

```python
# ai-server/workers/agent_worker.py
import json
from datetime import datetime
import redis.asyncio as aioredis
from langchain_core.messages import HumanMessage, AIMessage
from langchain_community.callbacks import get_openai_callback

from agents.supervisor import graph
from db.chat_history import save_message, get_conversation_messages
from state.memory import remember_entity


async def run_agent_task(
    ctx: dict,
    *,
    turn_id: str,
    conversation_id: str,
    user_id: str,
    message: str,
):
    """
    ARQ task — runs LangGraph agent, streams events to Redis PubSub.
    
    Flow:
      1. Streaming Deduplication Check (Redis Lock)
      2. Load history (Tier 1 memory)
      3. Run graph.astream_events() with periodic Cancellation Check
      4. Publish token_stream → sse:{turn_id}
      5. On complete: save to PostgreSQL + extract entities + release lock
    """
    redis: aioredis.Redis = ctx["redis"]
    stream_lock_key = f"lock:stream:{conversation_id}"

    # ── 1. Streaming Deduplication Check ─────────────────────────────
    # Set lock for 30s to prevent client double-clicks/rapid reconnect loops
    is_locked = await redis.set(stream_lock_key, turn_id, ex=30, nx=True)
    if not is_locked:
        # Already running stream for this conversation
        await redis.publish(f"sse:{turn_id}",
            json.dumps({"event": "warning", "data": {"message": "Streaming already active for this conversation"}}))
        await redis.hset(f"session:{turn_id}", "status", "ignored")
        return

    await redis.hset(f"session:{turn_id}", mapping={
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
    })

    try:
        # ── 2. Build messages with history ────────────────────────────
        history_rows = await get_conversation_messages(conversation_id, user_id, limit=5)
        messages = [
            HumanMessage(content=r.content) if r.role == "user" else AIMessage(content=r.content)
            for r in history_rows
        ]
        messages.append(HumanMessage(content=message))

        # ── 3. Stream agent with cost and cancellation tracking ───────
        config = {"configurable": {"thread_id": conversation_id}}
        full_response = ""
        tokens_used = 0
        cost_usd = 0.0

        with get_openai_callback() as cb:
            async for event in graph.astream_events(
                {"messages": messages, "task": message,
                 "conversation_id": conversation_id, "turn_id": turn_id,
                 "user_id": user_id, "attempts": 0,
                 "errors": [], "confidence": 1.0, "approved": False},
                 config=config,
                 version="v2",
            ):
                # A. Periodic Job Cancellation Check
                # If front-end signals cancel, cancel:{turn_id} exists → clean abort
                if await redis.exists(f"cancel:{turn_id}"):
                    await redis.publish(f"sse:{turn_id}",
                        json.dumps({"event": "cancelled", "data": {"message": "Task cancelled by user"}}))
                    await redis.hset(f"session:{turn_id}", "status", "cancelled")
                    return

                etype = event["event"]

                if etype == "on_chat_model_stream":
                    chunk = event["data"]["chunk"].content
                    full_response += chunk
                    await redis.publish(f"sse:{turn_id}",
                        json.dumps({"event": "token_stream", "data": chunk}))

                elif etype == "on_chain_start":
                    await redis.publish(f"sse:{turn_id}",
                        json.dumps({"event": "node_start", "data": {"node": event.get("name")}}))

                elif "human_gate" in event.get("name", "") and etype == "on_chain_end":
                    await redis.publish(f"sse:{turn_id}",
                        json.dumps({"event": "human_gate",
                                    "data": {"turn_id": turn_id, "message": "Awaiting approval"}}))
                    await redis.hset(f"session:{turn_id}", "status", "awaiting_approval")
                    return   # Worker stops here — resume via /approve endpoint

            tokens_used = cb.total_tokens
            cost_usd    = cb.total_cost

        # ── 4. Persist to PostgreSQL ──────────────────────────────────
        await save_message(conversation_id, user_id, "assistant", full_response,
                           tokens_used=tokens_used, cost_usd=cost_usd)

        # ── 5. Extract entity to Tier 3 memory ───────────────────────
        # (in production: use LLM to extract, here is simple heuristic)
        await remember_entity(redis, conversation_id, "last_response", full_response[:200])

        # ── 6. Signal complete ─────────────────────────────────────────
        await redis.publish(f"sse:{turn_id}",
            json.dumps({"event": "agent_complete",
                        "data": {"tokens": tokens_used, "cost_usd": cost_usd}}))
        await redis.hset(f"session:{turn_id}", "status", "complete")

    except Exception as e:
        await redis.publish(f"sse:{turn_id}",
            json.dumps({"event": "error", "data": {"message": str(e)}}))
        await redis.hset(f"session:{turn_id}", "status", "failed")
        raise
    finally:
        # ALWAYS release the lock to enable subsequent prompts
        # Only delete lock if we are the turn that created it
        current_lock = await redis.get(stream_lock_key)
        if current_lock == turn_id:
            await redis.delete(stream_lock_key)


class WorkerSettings:
    functions   = [run_agent_task]
    redis_settings = {"host": "localhost", "port": 6379}
    max_jobs    = 10         # concurrent tasks
    job_timeout = 300        # 5 min max per task

    @classmethod
    async def on_startup(cls, ctx: dict):
        ctx["redis"] = await aioredis.from_url("redis://localhost:6379", decode_responses=True)

    @classmethod
    async def on_shutdown(cls, ctx: dict):
        await ctx["redis"].close()
```

---

## Step 4.3 — Agent Router

```python
# ai-server/routers/agent.py
import uuid, json
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from arq import create_pool
from arq.connections import RedisSettings

from auth.verify import verify_token
from db.chat_history import ensure_conversation, save_message
from guards.input import guard_input          # added in Step 04
from agents.supervisor import graph

router = APIRouter(prefix="/agent", tags=["agent"])


class InvokeRequest(BaseModel):
    conversation_id: str | None = None   # None = new conversation
    message: str


@router.post("/invoke")
async def invoke(body: InvokeRequest, request: Request, user=Depends(verify_token)):
    conversation_id = body.conversation_id or str(uuid.uuid4())
    turn_id         = str(uuid.uuid4())
    message         = guard_input(body.message, user_id=user["id"])   # sanitize

    await ensure_conversation(conversation_id, user["id"], first_message=message)
    await save_message(conversation_id, user["id"], "user", message)

    # Write Redis session
    redis = request.app.state.redis
    await redis.hset(f"session:{turn_id}", mapping={
        "status": "queued",
        "conversation_id": conversation_id,
        "user_id": user["id"],
    })
    await redis.expire(f"session:{turn_id}", 3600)

    # Enqueue ARQ
    pool = await create_pool(RedisSettings())
    await pool.enqueue_job("run_agent_task",
        turn_id=turn_id, conversation_id=conversation_id,
        user_id=user["id"], message=message)

    return {"turn_id": turn_id, "conversation_id": conversation_id,
            "sse_url": f"/sse/{turn_id}"}


@router.post("/{turn_id}/approve")
async def approve(turn_id: str, request: Request, user=Depends(verify_token)):
    redis   = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")
    if not session:
        raise HTTPException(404, "Turn not found")
    if session.get("user_id") != user["id"]:
        raise HTTPException(403, "Forbidden")

    config = {"configurable": {"thread_id": session["conversation_id"]}}
    await graph.ainvoke(None, config=config)     # resume from checkpoint
    await redis.hset(f"session:{turn_id}", "status", "resumed")
    return {"status": "resumed"}


@router.post("/{turn_id}/reject")
async def reject(turn_id: str, request: Request, user=Depends(verify_token)):
    redis = request.app.state.redis
    await redis.hset(f"session:{turn_id}", "status", "rejected")
    await redis.publish(f"sse:{turn_id}", json.dumps({"event": "rejected", "data": {}}))
    return {"status": "rejected"}


@router.get("/{turn_id}/state")
async def get_state(turn_id: str, request: Request, user=Depends(verify_token)):
    redis   = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")
    if not session:
        raise HTTPException(404, "Turn not found")
    config = {"configurable": {"thread_id": session["conversation_id"]}}
    state  = graph.get_state(config)
    return {"session": session, "agent_next": list(state.next)}
```

---

## Step 4.4 — Start Worker

```bash
# Terminal 1: FastAPI
uvicorn main:app --reload --port 8000

# Terminal 2: ARQ Worker (separate process)
arq workers.agent_worker.WorkerSettings

# Test invoke
curl -X POST http://localhost:8000/agent/invoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}'
# → {"turn_id":"abc","conversation_id":"xyz","sse_url":"/sse/abc"}

# Debug Redis
redis-cli HGETALL session:<turn_id>
redis-cli PUBSUB CHANNELS "sse:*"
```

## Verification Checklist

- [ ] ARQ worker starts without import errors
- [ ] `POST /agent/invoke` returns `turn_id` + `conversation_id`
- [ ] Redis session `session:{turn_id}` is created with status `queued → running → complete`
- [ ] Redis PubSub publishes `token_stream` events
- [ ] PostgreSQL `messages` table has the AI response after completion

> ➡️ Next: [Step 05 — Guardrails](./05-guardrails.md)
