# HyperKit

> A full-stack AI chatbot with real-time streaming, multi-tenant isolation, LangGraph-based agents, and MCP tool integration.

## Key Features

- **Real-time streaming** via SSE (Server-Sent Events) with support for streaming thinking blocks
- **Multi-tenant isolation** via `user_id` (Clerk `sub` claim)
- **LangGraph supervisor agent** with human-in-the-loop approval gating
- **MCP tool registry** — multi-tenant, per-user MCP server configuration with credential encryption and OAuth UI placeholder
- **3-tier memory**: PostgreSQL (working) + Redis (session summary) + checkpoint persistence
- **Hybrid architecture**: Next.js frontend (Vercel) + FastAPI backend (VPS Docker)
- **JWT authentication** via Clerk (managed SaaS)

---

## Architecture Overview

```
Browser
  │
  │ HTTP POST /v1/agent/chat
  ▼
┌─────────────────────────┐
│   Next.js 16 (Vercel)    │
│   Route Handler          │
│   /app/api/.../route.ts  │
└───────────┬─────────────┘
            │ HTTP POST /v1/agent/chat (Bearer JWT)
            ▼
┌─────────────────────────┐
│   FastAPI (VPS)          │
│   ┌─────────────────┐  │
│   │ Auth Middleware   │  │  Verifies Clerk JWT via JWKS
│   └─────────────────┘  │
│   ┌─────────────────┐  │
│   │ LangGraph Agent  │  │  Supervisor + human-in-the-loop
│   │ (agents/)        │  │  MCP tools + checkpoint state
│   └────────┬────────┘  │
│            │             │
│   ┌────────▼────────┐  │
│   │ SSE Publisher   │  │  Redis PubSub sse:{turn_id}
│   │ (routers/sse)   │  │
│   └─────────────────┘  │
└────────────┼────────────┘
             │
             │ Redis PubSub
             ▼
┌─────────────────────────┐
│   SSE Response          │
│   /v1/sse/{turn_id}     │
└───────────┬─────────────┘
            │ EventSource stream
            ▼
          Browser ◄──── Tokens stream in real-time

┌──────────────────────────────────────────┐
│              PostgreSQL                    │
│  (chat_history, LangGraph checkpoints,    │
│   user_mcp_configs)                      │
└──────────────────────────────────────────┘
```

### API Endpoints (`/v1`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agent/chat` | Invoke agent, returns `{ turn_id, sse_url }` |
| `GET`  | `/sse/{turn_id}` | SSE stream for agent tokens |
| `GET`  | `/history/{conversation_id}` | Retrieve conversation history |
| `GET`  | `/mcp/catalog` | List available MCP servers |
| `POST` | `/mcp/configs` | Create user MCP server config |
| `GET`  | `/mcp/configs` | List user's MCP server configs |
| `PATCH`| `/mcp/configs/{id}` | Update a config (enable/disable) |
| `DELETE`| `/mcp/configs/{id}` | Delete a config |
| `GET`  | `/system/health` | Health check |

### Architecture Flow

1. **Browser** sends message → `POST /v1/agent/chat` (Next.js Route Handler)
2. **Next.js** proxies to FastAPI with Bearer JWT
3. **FastAPI** writes Redis session + initiates async agent processing
4. **FastAPI** returns `{ turn_id, sse_url }` immediately
5. **Browser** opens `EventSource` → `/v1/sse/{turn_id}`
6. **FastAPI SSE** subscribes Redis PubSub `sse:{turn_id}`
7. **Agent** runs LangGraph supervisor → publishes tokens → SSE → Browser
8. **Approval gating**: agent halts at `needs_approval` → browser prompts user → user approves/denies → agent resumes

---

## Tech Stack

| Layer             | Technology                                                  |
| ----------------- | ----------------------------------------------------------- |
| **Frontend**      | Next.js 16 (TypeScript), App Router                        |
| **Backend**       | FastAPI (Python), LangGraph, Pydantic, SQLAlchemy          |
| **Auth**          | Clerk (JWT verification via JWKS)                           |
| **Database**      | PostgreSQL (chat history, LangGraph checkpoints, MCP configs) |
| **Cache/Session** | Redis (PubSub for SSE tokens, session TTL)                 |
| **Infrastructure**| Docker, Docker Compose, GitHub Actions, GHCR               |

---

## Get Running

**Prerequisites:** Docker 24.0+ · Docker Compose 2.20+ · Make · Git 2.40+ · Clerk account

```bash
# 1. Clone & configure
git clone https://github.com/your-org/hyperkit-ai.git
cd hyperkit-ai
cp .env.example .env

# → Fill in Clerk credentials + database URLs in .env

# 2. Start infrastructure
cd src/server && docker compose -f docker-compose.yml up -d

# 3. Start FastAPI server
cd src/server
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000

# 4. Start frontend (separate terminal)
cd src/frontend
pnpm install
pnpm run dev
```

**Services:** postgres :5432 · redis :6379 · backend :8000 · frontend :3000

---

## Directory Structure

```
hyperkit-ai/
├── src/
│   ├── server/               # FastAPI backend
│   │   ├── agents/           # LangGraph supervisor graph
│   │   ├── db/               # SQLAlchemy models + chat history
│   │   ├── infra/            # Database init SQL
│   │   ├── llm/              # LLM router (task routing)
│   │   ├── mcp_registry/     # MCP catalog, credential management
│   │   ├── middleware/        # Request logging
│   │   ├── routers/           # API route modules
│   │   │   ├── agent.py       # /v1/agent/chat
│   │   │   ├── sse.py         # /v1/sse/{turn_id}
│   │   │   ├── history.py     # /v1/history/{conversation_id}
│   │   │   ├── mcp.py         # /v1/mcp/*
│   │   │   └── system.py      # /v1/system/health
│   │   ├── state/             # Memory & checkpoint management
│   │   ├── workers/           # Agent worker
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile
│   │   └── main.py            # FastAPI app factory + lifespan
│   └── frontend/              # Next.js App Router
│       ├── app/               # Pages & Route Handlers
│       └── ...                # (see src/frontend/CLAUDE.md)
├── docs/                     # Implementation roadmap
└── .github/workflows/        # CI/CD
```

---

## Key Patterns

### Agent Approval Gating
The LangGraph supervisor halts at a `needs_approval` node. The SSE stream pauses, the frontend displays an approval prompt, and the user approves or denies before the agent resumes.

### Multi-Tenant MCP Tools
Users configure MCP servers (Filesystem, Fetch, etc.) via `/v1/mcp/configs`. Credentials are encrypted at rest using `mcp_registry/crypto.py`. Each user's enabled tools are injected into the supervisor graph at runtime.

### Thinking Blocks
Agent responses can include streaming "thinking blocks" (metadata tokens) which render inline in the frontend as expandable thought process UI.

### Checkpoint Persistence
LangGraph state is checkpointed to PostgreSQL via `state/checkpoint.py`. Graph state survives worker restarts.

---

## Environment Variables

### Backend (`src/server/.env`)

| Variable            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `CLERK_FRONTEND_API`| Clerk frontend API (e.g. `your-app.clerk.accounts.dev`)    |
| `CLERK_ISSUER_URL`  | Full issuer URL (e.g. `https://your-domain.clerk.accounts.com`) |
| `CLERK_AUDIENCE`    | Token audience (use your frontend API URL)                 |
| `DATABASE_URL`      | PostgreSQL connection string                               |
| `REDIS_URL`         | Redis connection string                                    |
| `FRONTEND_URL`      | Frontend URL for CORS (no `NEXT_PUBLIC_` prefix)          |

---

## Troubleshooting

| Symptom                              | Fix                                                       |
| ------------------------------------ | --------------------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:5432`        | Ensure PostgreSQL is running via Docker                   |
| `ECONNREFUSED 127.0.0.1:6379`        | Ensure Redis is running via Docker                        |
| Clerk JWT verification fails         | Check `CLERK_ISSUER_URL` and `CLERK_AUDIENCE` match Clerk dashboard |
| SSE stream not connecting            | Verify `FRONTEND_URL` is correct and accessible           |
| Worker not processing tasks          | Check Redis connection is healthy                         |
| `pnpm: command not found`            | `npm install -g pnpm`                                     |
| Frontend build fails (Next.js 16)    | Read `src/frontend/AGENTS.md` for breaking changes       |

---

## Production Deployment (VPS)

**1. Prepare VPS** — install Docker, clone repo, create `.env.prod`

**2. GitHub Secrets** → Settings → Secrets and variables → Actions:

| Secret        | Value                                 |
| ------------- | ------------------------------------- |
| `VPS_HOST`    | VPS IP address                        |
| `VPS_USER`    | SSH username (e.g., `ubuntu`)         |
| `VPS_SSH_KEY` | Private key contents (`~/.ssh/id_rsa`) |

**3. Push to `main`** — CI/CD automatically:
1. Run linting + type checking
2. Build Docker images
3. Push to GHCR
4. SSH into VPS
5. Pull images + recreate containers