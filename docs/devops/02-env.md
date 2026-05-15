# Step 02 — Environment Variables Management

## Service Separation

The project consists of **3 separate services**, each with its own `.env` file:

```
ai-chatbot/
├── backend/       ← Python FastAPI          → .env (backend/.env)
├── frontend/      ← Next.js                → .env.local (frontend/.env.local)
└── .env           ← Shared infra vars (Docker Compose reads this)
```

> ⚠️ **Never commit `.env` files.** Use `.env.example` as templates.

---

## Root `.env` — Infrastructure + Docker Compose

```env
# .env (root — read by docker-compose.yml)
# ── PostgreSQL ──────────────────────────────────────────────────────────
POSTGRES_USER=chatbot
POSTGRES_PASSWORD=change-me-in-production
POSTGRES_DB=chatbot
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# ── Redis ───────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Clerk (Production keys in root for compose) ───────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---



---

## `backend/.env` — Python FastAPI Service

```env
# backend/.env
# ── Auth verification (Clerk) ────────────────────────────────────────────
CLERK_FRONTEND_API=your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...

# ── Database (separate chat_db) ──────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://chatbot:change-me@localhost:5432/chat_db

# ── Redis ────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── LLM providers ────────────────────────────────────────────────────────
LLM_PROVIDER=openai              # "openai" | "anthropic" | "local"
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# On-premise vLLM (set LLM_PROVIDER=local to use)
VLLM_BASE_URL=http://localhost:8080/v1

# ── Guardrails ────────────────────────────────────────────────────────────
MAX_COST_PER_REQUEST_USD=5.0
MAX_TOOL_CALLS_PER_SESSION=15

# ── Observability ─────────────────────────────────────────────────────────
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=ai-chatbot-prod

# ── Alerts ────────────────────────────────────────────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# ── Server ────────────────────────────────────────────────────────────────
ENV=development
PORT=8000
```

---

## `frontend/.env.local` — Next.js Service

```env
# frontend/.env.local

# ✅ NEXT_PUBLIC_ → visible to browser (keep minimal)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

# ❌ No NEXT_PUBLIC_ → server-side only (NEVER exposed to the browser)
BACKEND_URL=http://localhost:8000
```

---

## `.env.example` Templates (commit these)

```bash
# Create example files for each service
cp backend/.env      backend/.env.example
cp frontend/.env.local frontend/.env.local.example
cp .env              .env.example

# Strip real values — leave keys only

sed -i 's/=.*/=/' backend/.env.example
```

---

## `.gitignore` (root)

```gitignore
# .gitignore
.env
backend/.env
frontend/.env.local
backend/checkpoints.db
__pycache__/
*.pyc
node_modules/
.next/
dist/
```

---

## Secret Rotation Checklist

| Secret | Where | Rotation Frequency |
|--------|-------|-------------------|
| `CLERK_SECRET_KEY` | root + backend | On breach / every 90 days |
| `POSTGRES_PASSWORD` | root + both services | Every 90 days |
| `OPENAI_API_KEY` | backend | On breach |
| `LANGCHAIN_API_KEY` | backend | Every 90 days |


---

## Production Secret Management

For production, use a secret manager instead of `.env` files:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret --name ai-chatbot/prod/backend \
  --secret-string file://backend/.env

# Then in docker-compose.yml, inject at runtime:
# secrets:
#   backend_env:
#     external: true
```

> ➡️ Next: [03-cicd.md](./03-cicd.md)
