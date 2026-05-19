# HyperKit

> A full-stack AI chatbot with real-time streaming, multi-tenant isolation, LangGraph-based agents, and MCP tool integration.

## Key Features

- Real-time streaming chat via SSE (Server-Sent Events)
- Multi-tenant isolation via `clerk_user_id`
- LangGraph-based agent with 3-tier memory (PostgreSQL, Redis, Vector store)
- MCP tool integration for extensible capabilities
- Hybrid architecture: **Vercel** (frontend) + **VPS** (FastAPI backend)
- JWT authentication via **Clerk** (managed SaaS)

---

## Architecture Overview

```
Browser
  │
  │ HTTP POST /api/chat
  ▼

┌─────────────────────────┐
│   Next.js 16 (Vercel)    │
│   Route Handler          │
│   /app/api/chat/route.ts │
└───────────┬─────────────┘
            │ HTTP POST /agent/invoke (Bearer JWT)
            ▼
┌─────────────────────────┐
│   FastAPI (VPS)          │
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

### Architecture Flow

1. **Browser** sends message → `POST /api/chat` (Next.js Route Handler)
2. **Next.js** proxies to `POST /agent/invoke` (FastAPI, Bearer JWT)
3. **FastAPI** writes Redis session + enqueues ARQ task, returns `{ turn_id, sse_url }`
4. **Browser** opens `EventSource` → `/api/sse/[turnId]` (Next.js SSE proxy)
5. **FastAPI** SSE subscribes Redis PubSub `sse:{turn_id}`
6. **ARQ Worker** runs LangGraph → publishes tokens → SSE → Browser

---

## Tech Stack

| Layer             | Technology                                                  |
| ----------------- | ----------------------------------------------------------- |
| **Frontend**      | Next.js 16 (TypeScript), App Router                        |
| **Backend**       | FastAPI (Python), LangGraph, ARQ worker, Pydantic          |
| **Auth**          | Clerk (JWT verification via JWKS)                           |
| **Database**      | PostgreSQL (chat history, LangGraph checkpoints)            |
| **Cache/Session** | Redis (session TTL, PubSub for SSE tokens)                 |
| **Vector Store**  | Long-term memory (configurable provider)                    |
| **Infrastructure**| Docker, Docker Compose, GitHub Actions, GHCR               |

---

## ⚡ Get Running in 2 Minutes (Recommended)

**Prerequisites:** Docker 24.0+ · Docker Compose 2.20+ · Make · Git 2.40+ · Clerk account

```bash
# 1. Clone & configure
git clone https://github.com/your-org/ai-chatbot.git
cd ai-chatbot
cp .env.example .env

# → Fill in Clerk credentials + database URLs in .env

# 2. Start infrastructure
docker compose -f docker-compose.infra.yml up -d

# 3. Start AI Server (FastAPI)
cd ai-server
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000

# 4. Start worker (separate terminal)
cd ai-server
source .venv/bin/activate
python -m arq ai_server.worker.WorkerSettings

# 5. Start frontend (separate terminal)
cd frontend
pnpm install
pnpm run dev
```

**Services:** postgres :5432 · redis :6379 · backend :8000 · frontend :3000

Stop: `docker compose -f docker-compose.infra.yml down` | Logs: `docker compose -f docker-compose.infra.yml logs`

---

## Native Development

Requires: Node.js 20+ · Python 3.11+ · PostgreSQL 15+ · Redis 7+

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

---

## Key Identifiers

| Identifier        | Storage      | TTL       | Purpose                       |
| ----------------- | ------------ | --------- | ----------------------------- |
| `conversation_id` | PostgreSQL   | Permanent | Chat history persistence      |
| `turn_id`         | Redis        | 1 hour    | Real-time streaming session   |

## 3-Tier Memory

| Tier | Storage                        | Purpose              |
| ---- | ------------------------------ | -------------------- |
| 1    | PostgreSQL (last N messages)  | Working memory       |
| 2    | Redis (session summary)        | Session memory       |
| 3    | Vector store                   | Long-term memory     |

## Multi-Tenant Isolation

All queries are scoped by `user_id` — the Clerk `sub` claim extracted from the JWT.

---

## Environment Variables

### AI Server (`ai-server/.env`)

| Variable            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `CLERK_FRONTEND_API`| Clerk frontend API (e.g. `your-app.clerk.accounts.dev`)    |
| `CLERK_ISSUER_URL`  | Full issuer URL (e.g. `https://your-domain.clerk.accounts.com`) |
| `CLERK_AUDIENCE`    | Token audience (use your frontend API URL, not `"clerk"`) |
| `CHAT_DATABASE_URL` | PostgreSQL connection string                               |
| `REDIS_URL`         | Redis connection string                                    |
| `BACKEND_URL`       | FastAPI server URL (no `NEXT_PUBLIC_` prefix)             |

> **Note:** All FastAPI calls go through Next.js Route Handlers — the browser never calls FastAPI directly.

---

## Directory Structure

```
ai-chatbot/
├── ai-server/           # FastAPI + LangGraph + ARQ worker
```
│   ├── auth/            # Clerk JWT verification
│   ├── core/             # Exceptions, schemas
│   ├── db/              # SQLAlchemy models + chat history queries
│   ├── middleware/      # Structlog request logging
│   ├── routers/         # Route modules
│   ├── main.py          # FastAPI app factory + lifespan
│   └── config.py         # Pydantic Settings (env vars)
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

---

## Troubleshooting

| Symptom                                   | Fix                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:5432` (PostgreSQL) | Ensure PostgreSQL is running: `sudo systemctl status postgresql`                         |
| `ECONNREFUSED 127.0.0.1:6379` (Redis)      | Ensure Redis is running: `sudo systemctl status redis`                                   |
| Clerk JWT verification fails              | Check `CLERK_ISSUER_URL` and `CLERK_AUDIENCE` match your Clerk dashboard settings        |
| SSE stream not connecting                 | Verify `BACKEND_URL` is correct and accessible from Vercel (no `localhost`)             |
| Worker not processing tasks               | Check ARQ worker is running and Redis connection is healthy                              |
| `pnpm: command not found`                 | `npm install -g pnpm`                                                                    |
| Frontend build fails (Next.js 16)          | Read `frontend/AGENTS.md` for Next.js 16 breaking changes before modifying frontend code |

---

## 🚀 Production Deployment (VPS)

**1. Prepare VPS** — install Docker, clone repo, create `.env.prod`

**2. GitHub Secrets** → Settings → Secrets and variables → Actions:

| Secret        | Value                                 |
| ------------- | ------------------------------------- |
| `VPS_HOST`    | VPS IP address                        |
| `VPS_USER`    | SSH username (e.g., `ubuntu`)         |
| `VPS_SSH_KEY` | Private key contents (`~/.ssh/id_rsa`) |

**3. Push to `main`** — CI/CD automatically:

1. Run linting + tests
2. Build Docker images
3. Push to GHCR
4. SSH into VPS
5. Pull images + recreate containers

---

## Implementation Roadmap

Follow numbered steps in `docs/` in order — they have dependencies:

1. `docs/00-infrastructure/` — Docker + PostgreSQL + Redis (run FIRST)
2. `docs/01-ai-server/` Steps 01–08 — FastAPI → Auth → LangGraph → Worker → Guardrails → SSE → MCP → Observability
3. `docs/02-frontend/` Steps 09–12 — Next.js setup → Clerk auth → chat UI → history
4. `docs/03-devops/` Steps 13–16 — Docker → env → CI/CD → deployment
5. `docs/04-security/` Step 17 — Security hardening (do after backend is complete)

---

## Important Notes

- **Next.js 16 has breaking changes from training data** — read `frontend/AGENTS.md` before writing frontend code. `frontend/CLAUDE.md` and `frontend/AGENTS.md` delegate to this warning.
- Auth uses **Clerk** — Managed service with JWT verification in FastAPI backend via JWKS.
- No `backend/` directory exists — the Python service is `ai-server/`.