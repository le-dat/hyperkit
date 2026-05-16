# Step 00 — Infrastructure: PostgreSQL + Redis

## Goal

Spin up shared infrastructure used by all services:
- **PostgreSQL** — chat DB (FastAPI)
- **Redis** — session cache, PubSub bridge, ARQ queue, entity memory

> ✅ Do this step FIRST — all other services depend on it.

---

# docker-compose.yml (Base / VPS)
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: ai_chatbot_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-chatbot}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-chatbot_pass}
      POSTGRES_DB: ${POSTGRES_DB:-chatbot}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - chatbot_net

  redis:
    image: redis:7-alpine
    container_name: ai_chatbot_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - chatbot_net

volumes:
  postgres_data:
  redis_data:

networks:
  chatbot_net:
    name: chatbot_network
    driver: bridge

## Step 1.2 — docker-compose.override.yml (Local only)

```yaml
# docker-compose.override.yml
version: "3.9"

services:
  postgres:
    ports:
      - "5432:5432" # Expose for Local DB tools

  redis:
    ports:
      - "6379:6379" # Expose for Local Redis tools
```

---

## Step 1.3 — infra/init.sql (chat DB setup)

```sql
-- infra/init.sql
-- Create database for chat service

-- Chat DB (owned by FastAPI)
CREATE DATABASE chat_db;
GRANT ALL PRIVILEGES ON DATABASE chat_db TO chatbot;
```

---

## Step 1.3 — Chat DB Schema

```sql
-- Run this against chat_db after FastAPI starts
-- (SQLAlchemy will auto-create, but keep this as reference)

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(100) UNIQUE NOT NULL,
  user_id         VARCHAR(100) NOT NULL, -- This will be the Clerk User ID
  title           VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(100) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  role            VARCHAR(20)  NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT         NOT NULL,
  tokens_used     INT          DEFAULT 0,
  cost_usd        DECIMAL(10,6) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_user    ON conversations(user_id, updated_at DESC);
```

---

## Step 1.4 — Redis Key Convention

| Key Pattern | Type | TTL | Owner | Purpose |
|------------|------|-----|-------|---------|
| `session:{turn_id}` | Hash | 1h | FastAPI | Turn metadata: status, user_id, conv_id |
| `session:{conv_id}:entities` | Hash | 24h | Worker | Semantic entity memory (vendor, IDs) |
| `sse:{turn_id}` | PubSub channel | — | Worker → FastAPI | SSE event bridge |
| `ratelimit:{user_id}` | String incr | 60s | FastAPI | Per-user rate limit |
| `arq:queue:default` | List | — | ARQ | Task queue |

---

## Step 1.6 — Start Infrastructure

> ⚠️ **Note**: Run these commands from the `ai-server` directory.

### For Local Development
Simply run (Docker will automatically use `docker-compose.yml` + `docker-compose.override.yml`):
```bash
cd ai-server
docker compose up -d
```

### For VPS Deployment
Ensure ONLY `docker-compose.yml` is present (or specify it explicitly):
```bash
cd ai-server
docker compose -f docker-compose.yml up -d
```

### Verify
```bash
# Check health
docker compose ps

# Test PostgreSQL (Local)
psql -h localhost -U chatbot -d chat_db -c "\l"

# Test Redis (Local)
redis-cli ping
```

---

## Step 1.7 — .env (shared infra variables)

Located at `ai-server/.env`:

```env
# .env (shared across all backend services)
POSTGRES_USER=chatbot
POSTGRES_PASSWORD=chatbot_pass
POSTGRES_DB=chatbot
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# FastAPI Database Connection
CHAT_DATABASE_URL=postgresql+asyncpg://chatbot:chatbot_pass@localhost:5432/chat_db

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Verification Checklist

- [ ] `docker compose ... up -d` — no errors
- [ ] `docker ps` shows both containers as **healthy**
- [ ] `psql` connects to `chat_db`
- [ ] `redis-cli ping` returns `PONG`
- [ ] `chat_db` exists and is ready for FastAPI

> ➡️ Next: [Step 01 — FastAPI Core](../01-ai-server/01-fastapi-core.md)
