# HyperKit AI

> **AI-powered productivity assistant** with a sleek, terminal-inspired UI, customisable agents, conversation history, and real-time token-streaming.

<https://github.com/user-attachments/assets/49460747-ee69-4fa8-adae-87e97a425fd4>

## 🏗️ Architecture & Technical Design 

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                        Next.js Frontend (Vercel)                        │
 │  ┌──────────────────────────────────┐   ┌────────────────────────────┐  │
 │  │        Web Client (UI)           │   │    Gateway Proxy Router    │  │
 │  │  · React 19 / Tailwind CSS v4    │   │  · api/chat/[...path]      │  │
 │  │  · Framer Motion Micro-effects   │   │  · api/[...all]            │  │
 │  │  · Clerk Authentication SDK      │   │  · Handles token parsing   │  │
 │  └─────────────────┬────────────────┘   └─────────────┬──────────────┘  │
 └────────────────────┼──────────────────────────────────┼─────────────────┘
                      │ Clerk JWT (Short-Lived)          │
                      │ & API Proxied Requests           │ SSE Token Streams (Real-Time)
                      ▼                                  ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                          AI Backend (VPS / VM)                          │
 │                                                                         │
 │  ┌───────────────────────────────────────────────────────────────────┐  │
 │  │                      FastAPI Server (Port 8000)                   │  │
 │  │  · Auth Middleware: Sub-millisecond JWKS verification            │  │
 │  │  · API Handlers: Session initialization, history retrieval        │  │
 │  │  · SSE Router: Subscribes to Redis PubSub, streams to client      │  │
 │  └───────────────┬─────────────────────────────────▲─────────────────┘  │
 │                  │ Session Init /                  │ Redis PubSub
 │                  │ ARQ Job Dispatch                │ sse:{turn_id}
 │                  ▼                                 │
 │  ┌─────────────────────────────────────────────────┴─────────────────┐  │
 │  │                     ARQ Asynchronous Background Worker            │  │
 │  │  · Dequeues agent runs & streams tokens as they generate         │  │
 │  │  · Compiles & runs the dynamic LangGraph agentic workspace       │  │
 │  │  · Manages Supervisor logic & dynamically binds User MCP Tools   │  │
 │  └───────┬───────────────────────────┬───────────────────────────────┘  │
 └──────────┼───────────────────────────┼──────────────────────────────────┘
            ▼                           ▼
 ┌───────────────────────┐  ┌───────────────────────┐
 │      PostgreSQL       │  │         Redis         │
 │  · Chat History       │  │  · Token Buffers      │
 │  · MCP User Configs   │  │  · SSE PubSub Fabric  │
 │  · LangGraph State    │  │  · Session Metadata   │
 │    (PostgresSaver)    │  │                       │
 └───────────────────────┘  └───────────────────────┘
```

---


## 🚀 Quick Start

### 1. Backend + Infrastructure

```bash
cd src/server
cp .env.example .env   # fill in your Clerk + LLM keys
make dev-up             # spins up Postgres, Redis, FastAPI & ARQ worker
```

### 2. Frontend

```bash
cd src/frontend
cp .env.example .env.local   # add your NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
pnpm install && pnpm dev
```

Open `http://localhost:3000` — you're ready to chat.


#### Check Container Status

Verify all 4 core containers are running and healthy:

```bash
make dev-status
```

Expected Output:

```
NAME                   IMAGE                         STATUS                 PORTS
ai_chatbot_postgres    postgres:16-alpine            Up (healthy)           127.0.0.1:5433->5432/tcp
ai_chatbot_redis       redis:7-alpine                Up (healthy)           127.0.0.1:6379->6379/tcp
ai_chatbot_backend     hyperkit-backend:latest       Up (healthy)           127.0.0.1:8000->8000/tcp
ai_chatbot_worker      hyperkit-backend:latest       Up (healthy)           -
```

To tail the logs:

```bash
make dev-log
```

---

## 📁 Project Directory Structure

```
hyperkit-ai/
├── src/
│   ├── server/                   # FastAPI Backend & Workers
│   │   ├── agents/               # LangGraph supervisor nodes, dynamic tool loaders
│   │   ├── auth/                 # Clerk JWKS caching & JWT validation middleware
│   │   ├── core/                 # App lifespan, database bootstrap, Redis connections, custom exceptions
│   │   ├── db/                   # SQLAlchemy declarative models, query scopes, and async pool engine
│   │   ├── guards/               # Budget, input/output string, and tool limit guardrails
│   │   ├── infra/                # Initialization SQL files for local development
│   │   ├── llm/                  # API clients (Anthropic, OpenAI, custom routers like MiniMax)
│   │   ├── mcp_registry/         # AES-256 Fernet crypt system & MCP server catalog
│   │   ├── middleware/           # Structlog request logs, request ID trace tracking
│   │   ├── routers/              # API modules (Agent endpoint, SSE stream, History, MCP, Health)
│   │   ├── state/                # Memory session summary, PostgresSaver setup
│   │   ├── workers/              # ARQ worker engine (agent_worker.py, agent_task.py)
│   │   ├── config.py             # Pydantic Settings (Environment Variable schema)
│   │   ├── docker-compose.yml    # Production-ready container configurations
│   │   ├── docker-compose.override.yml # Local development port maps & volumes
│   │   ├── Dockerfile            # Multi-stage optimized build file
│   │   ├── Makefile              # Make command shortcuts (dev-up, dev-down, logs)
│   │   ├── main.py               # Application entrypoint & middleware setup
│   │   └── requirements.txt      # Python dependencies
│   │
│   └── frontend/                 # Next.js App Router Frontend
│       ├── app/                  # Pages, layouts, catch-all API Proxy Gateway routes
│       ├── components/           # Reusable Tailwind UI components (Chat layout, sidebar, etc.)
│       ├── hooks/                # Custom React queries and state-hooks
│       ├── lib/                  # Gateway routers, axios setups, Clerk constants
│       ├── provider/             # React Query & Theme wrappers
│       ├── store/                # Zustand client state (UI toggles, conversational states)
│       └── package.json          # Node dependencies (Next.js 16, Tailwind CSS v4, Radix)
│
├── docs/                         # Detailed Step-By-Step implementation roadmaps
└── README.md                     # Main documentation (You are here)
```
