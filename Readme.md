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

## 🚀 How To Run (Cách Chạy & Vận Hành)

### 📋 Prerequisites (Yêu cầu hệ thống)
*   **Operating System**: Linux (highly recommended) or macOS
*   **Docker & Compose**: Docker Engine 24.0+ & Compose v2.20+
*   **Node.js**: Node 20+ with `pnpm` installed (`npm i -g pnpm`)
*   **Python**: Python 3.11 or Python 3.12 (if running locally outside containers)
*   **Clerk**: A free Clerk account with a configured Application instance

---

### 🐳 Method A: Run Entire Stack via Docker (Recommended)
This method is the fastest, cleanest, and most production-like approach. It boots PostgreSQL, Redis, the FastAPI Backend, and the ARQ Worker altogether in development mode with hot-reload enabled via Docker volumes.

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

### 💻 Method B: Run Locally (Outside Containers for Quick Debugging)
If you prefer running the Python virtual environment and Next.js locally on your host machine while using Docker solely for Postgres & Redis databases:

#### Step 1: Spin Up PostgreSQL and Redis
Start only Postgres and Redis via Docker Compose:
```bash
cd src/server
docker compose up -d postgres redis
```
*Note: This binds PostgreSQL to `127.0.0.1:5433` and Redis to `127.0.0.1:6379` on your host machine.*

#### Step 2: Configure Local Backend VirtualEnv & Run FastAPI
In the `src/server` directory, create and activate a Python virtual environment, install requirements, and run the development server:
```bash
cd src/server

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI Server
python -m uvicorn main:app --reload --port 8000
```
FastAPI Swagger documentation will be accessible at `http://localhost:8000/docs`.

#### Step 3: Run the ARQ Worker (In a separate terminal)
In another terminal, activate the same virtual environment and start the ARQ worker to process LangGraph tasks:
```bash
cd src/server
source .venv/bin/activate
python -m arq workers.WorkerSettings
```

#### Step 4: Run the Next.js Frontend
In another terminal, start the Next.js dev server:
```bash
cd src/frontend
pnpm install
pnpm run dev
```

---

## 🔑 Environment Variables Reference

### Backend Settings (`src/server/.env`)

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `ENV` | Yes | App runtime context (`development` / `production`) | `development` |
| `POSTGRES_USER` | Yes | Postgres Admin Username | `chatbot` |
| `POSTGRES_PASSWORD`| Yes | Postgres Admin Password | `chatbot_pass` |
| `CHAT_DATABASE_URL`| Yes | SQL Connection string (FastAPI + SQLAlchemy) | `postgresql+asyncpg://chatbot:pass@127.0.0.1:5433/chat_db` |
| `REDIS_URL` | Yes | Redis Endpoint | `redis://localhost:6379` |
| `CLERK_FRONTEND_API`| Yes | Clerk app backend endpoint | `your-app.clerk.accounts.dev` |
| `CLERK_SECRET_KEY` | Yes | Clerk private key for authorization checks | `sk_test_...` |
| `CLERK_ISSUER_URL` | Yes | Full Clerk issuer URL | `https://your-app.clerk.accounts.dev` |
| `FRONTEND_URL` | Yes | CORS allowed origin address | `http://localhost:3000` |
| `LLM_PROVIDER` | Yes | Model core engine selector (`openai` / `anthropic`) | `anthropic` |
| `ANTHROPIC_API_KEY`| No | Anthropic SDK authentication | `sk-ant-...` |
| `OPENAI_API_KEY` | No | OpenAI SDK authentication | `sk-proj-...` |
| `MCP_ENCRYPTION_KEY`| Yes | Base64 AES-256 crypt key (raw must be 32 bytes) | `YW50aWdyYXZpdHktZGV2LWZhbGxiYWNrLTMyYnl0ZXM=` |

### Frontend Settings (`src/frontend/.env`)

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk Client-side public key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Yes | Clerk Server-side secret key | `sk_test_...` |
| `CHAT_BASE_URL` | Yes | Internal URL of the FastAPI agent server | `http://localhost:8000` |
| `MCP_BASE_URL` | Yes | Internal URL of the FastAPI MCP endpoints | `http://localhost:8000` |

---

## 🛠️ Troubleshooting & Diagnostic Checks

| Symptom | Probable Cause | Action / Fix |
| :--- | :--- | :--- |
| `Database connection failed` / `ECONNREFUSED` | FastAPI is trying to connect to the wrong port | When running the backend **locally** (Method B), ensure `CHAT_DATABASE_URL` points to `127.0.0.1:5433` (as exposed by `docker-compose.override.yml`). If running **inside Docker Compose** (Method A), the container connects directly to `postgres:5432`. |
| `MCP_ENCRYPTION_KEY` validation error | Key is not present or is not exactly 32-bytes when base64-decoded | Generate a valid 32-byte key in your terminal via `openssl rand -base64 32` and assign it to `MCP_ENCRYPTION_KEY` in `src/server/.env`. |
| Clerk JWT token fails to verify | Audience / Issuer URL configuration mismatch | Verify that `CLERK_ISSUER_URL` matches your Clerk instance URL and `CLERK_AUDIENCE` matches your Clerk Frontend API URL (usually `https://<your-app>.clerk.accounts.dev`). |
| Stream disconnects immediately | CORS policy blocking request | Check `FRONTEND_URL` in `src/server/.env`. Ensure there are no trailing slashes. Use `*` only for debugging in local environments. |
| Worker not responding to messages | ARQ daemon is not running | Ensure `python -m arq workers.WorkerSettings` is running in your virtual environment (if running Method B) or check container logs with `make dev-log` (if running Method A). |