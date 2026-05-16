# Step 06 — SSE Router + Chat History API

## Goal

- **SSE Router**: bridge Redis PubSub → browser `EventSource` (real-time token stream)
- **History Router**: conversation list (sidebar) + message replay per conversation

> **Prerequisite**: [Step 04 — Worker & LLM Router](./04-worker-llm.md) (worker publishes to Redis PubSub)

---

## File Structure

```
ai-server/
└── routers/
    ├── sse.py      ← GET /sse/{turn_id}
    └── history.py  ← GET /history, GET /history/{conv_id}
```

---

## Step 6.1 — SSE Router

```python
# ai-server/routers/sse.py
import json, asyncio
from fastapi import APIRouter, Request, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from auth.verify import verify_token

router = APIRouter(prefix="/sse", tags=["sse"])

TERMINAL_EVENTS = {"agent_complete", "error", "rejected"}


@router.get("/{turn_id}")
async def stream(turn_id: str, request: Request, user=Depends(verify_token)):
    """
    SSE endpoint — bridges Redis PubSub → browser EventSource.
    
    Worker publishes: redis.publish("sse:{turn_id}", json_event)
    Browser receives: streamed tokens in real-time
    """
    redis = request.app.state.redis
    session = await redis.hgetall(f"session:{turn_id}")

    if not session:
        raise HTTPException(404, "Turn not found")
    if session.get("user_id") != user["id"]:
        raise HTTPException(403, "Forbidden")

    async def generate():
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"sse:{turn_id}")
        deadline = asyncio.get_event_loop().time() + 300   # 5min max

        try:
            async for msg in pubsub.listen():
                if await request.is_disconnected():
                    break
                if asyncio.get_event_loop().time() > deadline:
                    yield {"event": "error", "data": json.dumps({"message": "Timeout"})}
                    break
                if msg["type"] != "message":
                    continue

                payload = json.loads(msg["data"])
                yield {"event": payload["event"],
                       "data": json.dumps(payload.get("data", {}))}

                if payload["event"] in TERMINAL_EVENTS:
                    break
        finally:
            await pubsub.unsubscribe(f"sse:{turn_id}")
            await pubsub.aclose()

    return EventSourceResponse(generate())
```

---

## Step 6.2 — History Router

```python
# ai-server/routers/history.py
from fastapi import APIRouter, Depends
from auth.verify import verify_token
from db.chat_history import get_user_conversations, get_conversation_messages

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def list_conversations(user=Depends(verify_token)):
    """Sidebar: list user's conversations ordered by most recent."""
    convs = await get_user_conversations(user["id"])
    return [
        {"conversation_id": c.conversation_id, "title": c.title,
         "updated_at": c.updated_at.isoformat()}
        for c in convs
    ]


@router.get("/{conversation_id}")
async def get_messages(conversation_id: str, user=Depends(verify_token)):
    """Reload: all messages for a conversation (when user clicks sidebar)."""
    msgs = await get_conversation_messages(conversation_id, user["id"], limit=100)
    return [
        {"role": m.role, "content": m.content,
         "tokens_used": m.tokens_used, "cost_usd": m.cost_usd,
         "created_at": m.created_at.isoformat()}
        for m in msgs
    ]
```

---

## Step 6.3 — Register routers in main.py

```python
# ai-server/main.py — add these imports
from routers.agent   import router as agent_router
from routers.sse     import router as sse_router
from routers.history import router as history_router

app.include_router(agent_router)
app.include_router(sse_router)
app.include_router(history_router)
```

---

## Step 6.4 — Verification

```bash
# 1. Invoke to get turn_id
curl -X POST http://localhost:8000/agent/invoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test SSE"}'
# → {"turn_id":"abc","sse_url":"/sse/abc"}

# 2. Connect SSE stream
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:8000/sse/abc
# → event: token_stream (tokens arrive as AI responds)
# → event: agent_complete (when done)

# 3. History
curl http://localhost:8000/history \
  -H "Authorization: Bearer <token>"
# → [{"conversation_id":"...","title":"Test SSE","updated_at":"..."}]

curl http://localhost:8000/history/<conv_id> \
  -H "Authorization: Bearer <token>"
# → [{"role":"user","content":"Test SSE"},{"role":"assistant","content":"..."}]

# 4. Redis debug
redis-cli PUBSUB CHANNELS "sse:*"
redis-cli HGETALL session:<turn_id>
```

## Verification Checklist

- [ ] SSE connects and receives `token_stream` events in real-time
- [ ] Stream closes after `agent_complete`
- [ ] `GET /history` returns list of conversations
- [ ] `GET /history/{conv_id}` returns messages in order
- [ ] Wrong user token on SSE → `403 Forbidden`

> ➡️ Next: [Step 07 — MCP](./07-mcp.md)
