# AI Chatbot

A full-stack AI chatbot with a **Hybrid (Vercel + VPS)** architecture. Real-time streaming chat via SSE, multi-tenant isolation via `clerk_user_id`, a LangGraph-based agent with 3-tier memory, and MCP tool integration.

## System Architecture

```
Browser
  │
  │ HTTP POST /api/chat
  ▼
┌─────────────────────────┐
│   Next.js (Vercel)       │
│   Route Handler          │
│   /app/api/chat/route.ts │
└───────────┬─────────────┘
            │ HTTP POST /agent/invoke (Bearer JWT)
            ▼
┌─────────────────────────┐
│   FastAPI (VPS)          │
│   ai-server/             │
│   ┌─────────────────┐    │
│   │ Auth Middleware  │    │  Verifies Clerk JWT via JWKS
│   │ (clerk.py)       │    │
│   └─────────────────┘    │
│   ┌─────────────────┐    │
│   │ LangGraph Agent │    │  3-tier memory + MCP tools
│   │ (agent/)        │    │
│   └────────┬────────┘    │
│            │               │
│   ┌────────▼────────┐    │
│   │ ARQ Worker      │    │  Enqueued task, publishes tokens
│   │ (worker.py)     │    │  via Redis PubSub
│   └────────┬────────┘    │
└────────────┼─────────────┘
             │                  ┌─────────────────┐
             │ Redis            │ PostgreSQL       │
             │ (session/TTL)    │ (chat_history)   │
             ▼                  └─────────────────┘
┌─────────────────────────┐
│   SSE Response         │
│   /api/sse/[turnId]     │
└───────────┬─────────────┘
            │ EventSource stream
            ▼
          Browser ◄──── Tokens stream in real-time
```

## Architecture Flow

1. **Browser** sends message → `POST /api/chat` (Next.js Route Handler)
2. **Next.js** proxies to `POST /agent/invoke` (FastAPI, Bearer JWT)
3. **FastAPI** writes Redis session + enqueues ARQ task, returns `{ turn_id, sse_url }`
4. **Browser** opens `EventSource` → `/api/sse/[turnId]` (Next.js SSE proxy)
5. **FastAPI** SSE subscribes Redis PubSub `sse:{turn_id}`
6. **ARQ Worker** runs LangGraph → publishes tokens → SSE → Browser

## Key Identifiers

| Identifier | Storage | TTL | Purpose |
| --- | --- | --- | --- |
| `conversation_id` | PostgreSQL | Permanent | Chat history persistence |
| `turn_id` | Redis | 1 hour | Real-time streaming session |

## Two Services

### Frontend — Next.js 16 (TypeScript)

- Served on **Vercel**
- Calls FastAPI through Route Handlers
- Next.js 16 has breaking changes — read `frontend/AGENTS.md` before writing frontend code

### AI Backend — FastAPI (Python)

- Runs on **VPS** as a Docker container
- ARQ worker for async task processing
- Auth via **Clerk** — JWT verified in FastAPI via JWKS

## 3-Tier Memory

| Tier | Storage | Purpose |
| --- | --- | --- |
| 1 | PostgreSQL (last N messages) | Working memory |
| 2 | Redis (session summary) | Session memory |
| 3 | Vector store | Long-term memory |

## Multi-Tenant Isolation

All queries are scoped by `user_id` — the Clerk `sub` claim extracted from the JWT.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Python 3.11+
- Clerk account (<https://clerk.com>)

### Infrastructure (PostgreSQL + Redis)

```bash
docker compose -f docker-compose.infra.yml up -d
```

### AI Server (FastAPI)

```bash
cd ai-server
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

### Worker (ARQ)

```bash
cd ai-server
source .venv/bin/activate
python -m arq ai_server.worker.WorkerSettings
```

### Frontend (Next.js)

```bash
cd frontend
pnpm install
pnpm run dev
```

## Environment Variables

### AI Server (`ai-server/.env`)

| Variable | Description |
| --- | --- |
| `CLERK_FRONTEND_API` | Clerk frontend API (e.g. `your-app.clerk.accounts.dev`) |
| `CLERK_ISSUER_URL` | Full issuer URL (e.g. `https://your-domain.clerk.accounts.com`) |
| `CLERK_AUDIENCE` | Token audience (use your frontend API URL, not `"clerk"`) |
| `CHAT_DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BACKEND_URL` | FastAPI server URL (no `NEXT_PUBLIC_` prefix) |

> **Note:** All FastAPI calls go through Next.js Route Handlers — the browser never calls FastAPI directly.

## Directory Structure

```
ai-chatbot/
├── ai-server/           # FastAPI + LangGraph + ARQ worker
│   ├── auth/            # Clerk JWT verification
│   ├── core/            # Exceptions
│   ├── db/              # SQLAlchemy models + chat history queries
│   ├── middleware/      # Structlog request logging
│   ├── routers/         # Route modules
│   ├── main.py          # FastAPI app factory + lifespan
│   └── config.py        # Pydantic Settings
├── frontend/            # Next.js App Router
│   ├── app/             # Next.js 16 App Router pages
│   ├── AGENTS.md        # Next.js 16 breaking changes warning
│   └── CLAUDE.md        # Delegates to root CLAUDE.md
└── docs/                # 17-step implementation roadmap
    ├── 00-infrastructure/
    ├── 01-ai-server/
    ├── 02-frontend/
    ├── 03-devops/
    └── 04-security/
```

## Implementation Roadmap

Follow numbered steps in `docs/` in order — they have dependencies:

1. `docs/00-infrastructure/` — Docker + PostgreSQL + Redis (run FIRST)
2. `docs/01-ai-server/` Steps 01–08 — FastAPI → Auth → LangGraph → Worker → Guardrails → SSE → MCP → Observability
3. `docs/02-frontend/` Steps 09–12 — Next.js setup → Clerk auth → chat UI → history
4. `docs/03-devops/` Steps 13–16 — Docker → env → CI/CD → deployment
5. `docs/04-security/` Step 17 — Security hardening (do after backend is complete)