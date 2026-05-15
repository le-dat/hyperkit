# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack AI chatbot with a **Hybrid (Vercel + VPS)** architecture. Real-time streaming chat via SSE, multi-tenant isolation, a LangGraph-based agent with 3-tier memory, and MCP tool integration.

Two services:
- **Frontend** (Next.js 16, TypeScript) — served on Vercel
- **AI Backend** (FastAPI, Python) — VPS Docker container with ARQ worker
- **Auth** (Clerk) — Managed service (SaaS)

## Directory Structure

```
ai-chatbot/
├── frontend/          # Next.js App Router
├── backend/           # FastAPI + LangGraph + ARQ
├── docs/              # 17-step implementation roadmap
│   ├── ai-agent/      # Steps 01–08: FastAPI, Clerk, LangGraph, worker, guardrails, SSE, MCP, observability
│   ├── frontend/       # Steps 09–12: Next.js, Clerk integration, chat UI, history
│   ├── devops/        # Steps 13–16: Docker, env, CI/CD, deployment
│   └── infrastructure/ # Step 00: PostgreSQL + Redis Docker setup
```

## Commands

### Frontend (Next.js 16)
```bash
cd frontend
pnpm install
pnpm run dev      # http://localhost:3000
pnpm run build
pnpm run lint
pnpm run lint --fix  # auto-fix lint errors
```

### Infrastructure (Docker)
```bash
docker compose -f docker-compose.infra.yml up -d   # PostgreSQL + Redis
```

### Backend (not yet created — follow docs/ai-agent/ steps 01–08)
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Architecture Flow

```
Browser → POST /api/chat (Next.js Route Handler)
       → POST /agent/invoke (FastAPI, attaches JWT)
       → FastAPI writes Redis session + enqueues ARQ task
       → FastAPI returns { turn_id, sse_url }
       → Browser opens EventSource → /api/sse/[turnId] (Next.js SSE proxy)
       → FastAPI SSE subscribes Redis PubSub sse:{turn_id}
       → ARQ Worker runs LangGraph → publishes tokens → SSE → Browser
```

Key identifiers: `conversation_id` (PostgreSQL), `turn_id` (Redis, 1h TTL). LangGraph state persisted via `PostgresSaver`.

## Implementation Roadmap

Follow the numbered steps in `docs/` exactly — they are ordered dependencies:
- Steps 00–08: Infrastructure → FastAPI core → Clerk Auth → LangGraph → Worker → Guardrails → SSE → MCP → Observability
- Steps 09–12: Next.js frontend (setup → Clerk auth → chat → history)
- Steps 13–16: DevOps (Docker → env → CI/CD → deployment)

Infrastructure step (00) creates `docker-compose.infra.yml` — run this first before starting any service.

## Important Notes

- **Next.js 16 has breaking changes from training data** — read `frontend/node_modules/next/dist/docs/` before writing frontend code. The `frontend/AGENTS.md` and `frontend/CLAUDE.md` delegate to this warning.
- Auth uses **Clerk** — Managed service with JWT verification in FastAPI backend.
- JWT verification uses JWKS cached in Redis.
- All FastAPI calls go through Next.js Route Handlers — browser never sees FastAPI URL directly
- `BACKEND_URL` env var must NOT have `NEXT_PUBLIC_` prefix (server-side only)
- The `backend/` directory does not yet exist — follow the ordered steps in `docs/ai-agent/` to build it