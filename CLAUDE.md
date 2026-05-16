# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack AI chatbot with a **Hybrid (Vercel + VPS)** architecture. Real-time streaming chat via SSE, multi-tenant isolation via `clerk_user_id`, a LangGraph-based agent with 3-tier memory, and MCP tool integration.

Two services:
- **Frontend** (Next.js 16, TypeScript) — served on Vercel, calls FastAPI through Route Handlers
- **AI Backend** (FastAPI, Python, in `ai-server/`) — VPS Docker container with ARQ worker
- **Auth** (Clerk) — Managed SaaS, JWT verified in FastAPI via JWKS

## Architecture Flow

```
Browser → POST /api/chat (Next.js Route Handler)
       → POST /agent/invoke (FastAPI, Bearer JWT)
       → FastAPI writes Redis session + enqueues ARQ task
       → FastAPI returns { turn_id, sse_url }
       → Browser opens EventSource → /api/sse/[turnId] (Next.js SSE proxy)
       → FastAPI SSE subscribes Redis PubSub sse:{turn_id}
       → ARQ Worker runs LangGraph → publishes tokens → SSE → Browser
```

Key identifiers: `conversation_id` (PostgreSQL), `turn_id` (Redis, 1h TTL).

## Directory Structure

```
ai-chatbot/
├── ai-server/            # FastAPI + LangGraph + ARQ worker
│   ├── auth/             # Clerk JWT verification (clerk.py, __init__.py)
│   ├── core/             # Exceptions (exceptions.py)
│   ├── db/               # SQLAlchemy models (models.py) + chat history queries (chat_history.py)
│   ├── middleware/       # Structlog request logging (logging.py)
│   ├── routers/          # Route modules (system.py)
│   ├── main.py           # FastAPI app factory + lifespan (DB/Redis init)
│   └── config.py         # Pydantic Settings (env vars)
├── frontend/             # Next.js App Router
│   ├── app/              # Next.js 16 App Router pages
│   ├── AGENTS.md         # Next.js 16 breaking changes warning
│   └── CLAUDE.md         # Delegates to root CLAUDE.md
└── docs/                 # 17-step implementation roadmap (numbered, ordered dependencies)
    ├── 00-infrastructure/  # Docker + PostgreSQL + Redis
    ├── 01-ai-server/      # Steps 01–08
    ├── 02-frontend/       # Steps 09–12
    ├── 03-devops/          # Steps 13–16
    └── 04-security/        # Step 17
```

## Key Architectural Patterns

- **LangGraph state persistence**: `PostgresSaver` checkpointing — graph state survives worker restarts
- **ARQ task queue**: Worker dequeues `RunAgent` tasks, publishes tokens via Redis PubSub
- **3-tier memory**: Tier 1 = last N messages from PostgreSQL (working memory), Tier 2 = Redis session summary, Tier 3 = Long-term vector store
- **Multi-tenant isolation**: All queries scoped by `user_id` (Clerk `sub` claim from JWT)
- **JWT verification**: Clerk JWKS cached at module level in `auth/clerk.py`, issuer resolved per-request

## Commands

### AI Server (FastAPI)
```bash
cd ai-server
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000   # dev server
```

### Worker (ARQ)
```bash
cd ai-server
source .venv/bin/activate
python -m arq ai_server.worker.WorkerSettings
```

### Infrastructure (Docker)
```bash
docker compose -f docker-compose.infra.yml up -d   # PostgreSQL + Redis
```

### Frontend (Next.js 16)
```bash
cd frontend
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm run lint --fix
```

## Environment Variables

AI Server uses `ai-server/.env`. Key auth vars:
- `CLERK_FRONTEND_API` — Clerk frontend API (e.g. `your-app.clerk.accounts.dev`)
- `CLERK_ISSUER_URL` — Full issuer URL (e.g. `https://your-domain.clerk.accounts.com`)
- `CLERK_AUDIENCE` — Token audience (default `"clerk"` is likely wrong — use your frontend API URL)
- `CHAT_DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string

All FastAPI calls go through Next.js Route Handlers — browser never calls FastAPI directly. `BACKEND_URL` must NOT have `NEXT_PUBLIC_` prefix (server-side only).

## Implementation Roadmap

Follow numbered steps in `docs/` in order — they have dependencies:
1. `docs/00-infrastructure/` — Docker + PostgreSQL + Redis (run FIRST)
2. `docs/01-ai-server/` Steps 01–08 — FastAPI → Auth → LangGraph → Worker → Guardrails → SSE → MCP → Observability
3. `docs/02-frontend/` Steps 09–12 — Next.js setup → Clerk auth → chat UI → history
4. `docs/03-devops/` Steps 13–16 — Docker → env → CI/CD → deployment
5. `docs/04-security/` Step 17 — Security hardening (do after backend is complete)

## Important Notes

- **Next.js 16 has breaking changes from training data** — read `frontend/node_modules/next/dist/docs/` before writing frontend code. `frontend/AGENTS.md` and `frontend/CLAUDE.md` delegate to this warning.
- Auth uses **Clerk** — Managed service with JWT verification in FastAPI backend via JWKS.
- No `backend/` directory exists — the Python service is `ai-server/`.