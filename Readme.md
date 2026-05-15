# AI Chatbot Agent — Production Documentation

The AI Chatbot Agent system is designed with a **Hybrid (Vercel + VPS)** architecture, optimized for performance, security, and observability.

This documentation provides an architectural overview and a detailed step-by-step implementation roadmap.

---

## 🏗 System Architecture (Vercel + VPS Hybrid)

```
┌──────────────────────────────────────────────────────────┐
│              Next.js Frontend (Vercel)                   │
│  Chat UI  ←→  /api/chat proxy  ←→  /api/sse/[turnId]    │
│  History Sidebar  ←→  /api/history proxy                  │
│  Auth (Clerk SDK) ←→  Clerk Managed Dashboard            │
└──────────────────────────────────────────────────────────┘
         │ Clerk JWT (Short-lived)         │ SSE stream (Proxied)
         ▼                                 ▼
┌──────────────────────────────────────────────────────────┐
│                    VPS (Ubuntu / Docker)                 │
│                                                          │
│              ┌──────────────────────────┐                │
│              │   FastAPI AI Backend     │                │
│              │   POST /agent/invoke     │                │
│              │   GET  /sse/{turn_id}    │                │
│              │   GET  /history          │                │
│              └────────────┬─────────────┘                │
│                           │                              │
│         ┌─────────────────┴─────────────────┐            │
│         │                 │                 │            │
│      Postgres           Redis            Clerk API       │
│      (chat_db)        (session)        (JWKS Verify)     │
└──────────────────────────────────────────────────────────┘
```

---

## 🗺 Implementation Roadmap

Follow this step-by-step roadmap in the exact numbered order.

### Phase 1 — Infrastructure & Backend Core
| Step | File | Service | What |
|------|------|---------|------|
| 00 | [Infrastructure](docs/infrastructure/01-infrastructure.md) | Infra | PostgreSQL + Redis: Docker setup & DB schema |
| 01 | [FastAPI Core](docs/ai-agent/01-fastapi-core.md) | **Python** | FastAPI app factory, config, SQLAlchemy models |
| 02 | [Backend Auth](docs/ai-agent/02-auth.md) | **Python** | Clerk JWT verification, JWKS caching |
| 03 | [LangGraph Agent](docs/ai-agent/03-langgraph-agent.md) | **Python** | LangGraph graph, 3-tier memory, checkpointer |
| 04 | [Worker & Router](docs/ai-agent/04-worker-llm.md) | **Python** | ARQ Worker + Multi-LLM router + agent endpoints |
| 05 | [Guardrails](docs/ai-agent/05-guardrails.md) | **Python** | Input, Output, Tool, Budget guards |
| 06 | [SSE & History](docs/ai-agent/06-sse-history.md) | **Python** | SSE router (PubSub → browser) + History API |
| 07 | [MCP Integration](docs/ai-agent/07-mcp.md) | **Python** | MCP registry, transport, dynamic tool binding |
| 08 | [Observability](docs/ai-agent/08-observability.md) | **Python** | structlog, LangSmith, Prometheus, RAGAS eval |

### Phase 2 — Next.js Frontend (`frontend/`)
| Step | File | What |
|------|------|------|
| 09 | [Frontend Setup](docs/frontend/01-setup.md) | Next.js boilerplate, Route Handler proxies |
| 10 | [Clerk Integration](docs/frontend/02-auth.md) | Login/Register pages via Clerk SDK |
| 11 | [Chat UI](docs/frontend/03-chat.md) | Chat UI, useChat hook, SSE streaming, human gate |
| 12 | [History Sidebar](docs/frontend/04-history.md) | History sidebar, useHistory hook, chat page assembly |

### Phase 3 — DevOps & Security
| Step | File | What |
|------|------|------|
| 13 | [Dockerization](docs/devops/01-docker.md) | Docker Compose: AI Backend + Redis + Postgres |
| 14 | [Env Management](docs/devops/02-env.md) | Env var management: separate `.env` per service |
| 15 | [CI/CD Pipeline](docs/devops/03-cicd.md) | GitHub Actions: CI pipelines + RAGAS gate |
| 16 | [Deployment](docs/devops/04-deploy.md) | Production: SSL, health checks, **Hybrid (Vercel)** |
| 17 | [Security](docs/security/01-security.md) | Hardening, Clerk JWT verification, audit log |

---

## 🔄 Technical Flow Details

### 1. Request Flow (Frontend → Backend)
1.  **User types** → POST `/api/chat` (Next.js Route Handler).
2.  **Route Handler fetches Clerk Token** → POST `/agent/invoke` (FastAPI) with `Authorization: Bearer <clerk_jwt>`.
3.  **FastAPI verifies JWT** using Clerk JWKS + writes Redis session + enqueues ARQ task.
4.  **FastAPI returns** `{ turn_id, sse_url }`.
5.  **Browser opens EventSource** → `/api/sse/[turnId]` (Next.js proxy).
6.  **FastAPI SSE** subscribes Redis PubSub `sse:{turn_id}`.
7.  **ARQ Worker** runs LangGraph → publishes tokens → SSE → Browser.

### 2. State Management
- **`conversation_id`**: Unique conversation identifier (PostgreSQL).
- **`turn_id`**: Current response turn identifier (Redis TTL 1h).
- **Checkpointing**: Uses `PostgresSaver` for graph state persistence.

---

## 🚀 Key Highlights
- **Tenant Isolation**: Data separation via `clerk_user_id`.
- **Reliability**: Fallback LLM mechanism and Circuit Breakers.
- **Observability**: Detailed tracing with LangSmith and JSON logs via structlog.
- **Security**: Managed authentication via Clerk and Guardrails protection.

---
*Refer to detailed documentation in each corresponding file in the Roadmap table above.*