# HyperKit AI

> **An Enterprise-Grade, Full-Stack AI Chatbot Platform**  
> Engineered with a high-performance **Hybrid (Vercel + VPS)** architecture. Featuring real-time **SSE (Server-Sent Events) streaming** of thinking & response tokens, **multi-tenant isolation**, a robust **LangGraph-based agentic workflow**, **ARQ asynchronous background workers**, and a dynamic **multi-tenant MCP (Model Context Protocol) tool registry** with encrypted-at-rest configurations.

---

## 🏗️ Architecture & Technical Design (Argitech)

HyperKit AI utilizes a robust hybrid topology splitting the frontend (optimized for latency, SSR, edge delivery via **Vercel**) from the stateful/agentic backend (optimized for raw compute, long-lived connections, background execution, and orchestration via a **VPS** or custom cluster).

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

### Technical Blueprint & Pillars

#### 1. Frontend Proxy Gateway & Authentication
*   **Security & Decoupling**: Browser clients never call the FastAPI backend directly. All API traffic runs through Next.js catch-all API Route Handlers (`src/frontend/app/api/[...all]` and `src/frontend/app/api/chat/[...path]`). This completely bypasses CORS issues, abstracts the backend server address, and isolates secure keys.
*   **Tenant Isolation via Clerk**: The authentication layer uses Clerk JWTs (JSON Web Tokens). The FastAPI `AuthMiddleware` extracts and validates Clerk JWT claims utilizing an in-memory, highly cached JWKS (JSON Web Key Set) lookup system. Every single database query and cache key is scoped directly by the verified Clerk `user_id` (the `sub` claim), ensuring absolute tenant isolation.

#### 2. Asynchronous Agentic Workflows with LangGraph
*   **Decoupled Orchestration**: Instead of executing heavy, multi-second LLM calls and tool loops inside the web server process (which would block Uvicorn's event loop), FastAPI publishes an agent run job to an **ARQ Worker Queue** via Redis, returning a unique response `turn_id` and an SSE endpoint in **under 10 milliseconds**.
*   **State Checkpointing (PostgresSaver)**: In production environments (`ENV=production`), LangGraph graph checkpoints are persisted directly to PostgreSQL via `PostgresSaver`. The state survives worker restarts and allows human-in-the-loop gates (e.g., waiting for sensitive tool approvals) to persist indefinitely.
*   **InMemorySaver Fallback**: In development or local testing environments, the backend dynamically falls back to `InMemorySaver` to avoid connection clutter and simplify quick cycles.

#### 3. Real-Time SSE Token Streaming
*   **Redis PubSub Engine**: As the ARQ Worker executes the LangGraph agent and generates thinking blocks or output tokens, it writes them instantly to a Redis PubSub channel configured with the turn prefix: `sse:{turn_id}`.
*   **Starlette SSE Handler**: The FastAPI server's SSE router subscribes to that Redis channel in real-time, yielding EventSource chunks back down through the Next.js API proxy to the web client.

#### 4. Three-Tier Memory Architecture
*   **Tier 1 (Working Memory)**: Active, in-flight context stored in PostgreSQL `messages` table, retrieving the last `N` messages dynamically.
*   **Tier 2 (Session Memory)**: Session metadata and summarized conversational threads stored in Redis cache with an configurable TTL (24h default).
*   **Tier 3 (Persistent State / MCP Workspaces)**: Durable LangGraph state checkpoints coupled with secure, user-owned persistent MCP file workspaces.

#### 5. Multi-Tenant Dynamic MCP Registry
*   **Encrypted-At-Rest Credentials**: Users can configure their own Model Context Protocol (MCP) servers (e.g. Google Drive, GitHub, Filesystem, Slack). Sensitive API keys and credentials are encrypted using AES-128-CBC + HMAC-SHA256 via Fernet (`cryptography` library) using `MCP_ENCRYPTION_KEY` and decrypted *only* at the sub-process execution level.
*   **Runtime Injection**: When the ARQ worker spins up an agent run, it fetches the user's enabled MCP configurations, spawns independent dynamic MCP client processes, binds their exposed tools to the LLM, and passes them as LangGraph nodes.

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

---

## 🚀 How To Run 

### 📋 Prerequisites
*   **Operating System**: Linux (highly recommended) or macOS
*   **Docker & Compose**: Docker Engine 24.0+ & Compose v2.20+
*   **Node.js**: Node 20+ with `pnpm` installed (`npm i -g pnpm`)
*   **Python**: Python 3.11 or Python 3.12 (if running locally outside containers)
*   **Clerk**: A free Clerk account with a configured Application instance

---

### 🐳 Run Entire Stack via Docker 

#### Step 1: Set Up Configurations
1.  **Backend Env**: Navigate to `src/server`, copy `.env.example` to `.env`, and populate your Clerk credentials, database names, and LLM API keys:
    ```bash
    cd src/server
    cp .env.example .env
    ```
2.  **Frontend Env**: Navigate to `src/frontend`, copy `.env.example` to `.env` (or create one), and configure your Clerk Publishable Key:
    ```bash
    cd src/frontend
    cp .env.example .env
    ```

#### Step 2: Spin Up Infrastructure and Backend Services
Open your terminal and run the following command using the Makefile inside the `src/server` directory:
```bash
cd src/server
make dev-up
```
> **What this does**: Automatically downloads Postgres & Redis, initializes the database tables using `infra/init.sql`, builds the FastAPI Backend + Worker Docker images locally, maps host directory volumes to `/app` for live code-reloads, and maps the ports.

#### Step 3: Check Container Status
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

#### Step 4: Run the Next.js Frontend
In a new terminal window, boot the Next.js development server:
```bash
cd src/frontend
pnpm install
pnpm run dev
```
Open `http://localhost:3000` in your browser.

---
