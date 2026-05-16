# Step 01 — Docker Compose: All Services in One Command

## Goal

`docker compose up` runs the entire stack:
- PostgreSQL + Redis (infrastructure)
- FastAPI Backend
- ARQ Worker
- Next.js Frontend
- Nginx (reverse proxy — ports 80/443)

---

## File Structure

```
ai-chatbot/
├── docker-compose.yml         ← full production stack
├── docker-compose.dev.yml     ← override for local dev (hot-reload)
├── nginx/
│   ├── nginx.conf
│   └── certs/                 ← SSL certificates (Let's Encrypt)
├── ai-server/
│   └── Dockerfile
└── frontend/
    └── Dockerfile
```

---

## Step 1.1 — docker-compose.yml

```yaml
version: "3.9"

services:
  # ── Infrastructure ────────────────────────────────────────────────────
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: chatbot
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5



  # ── FastAPI Backend ────────────────────────────────────────────────────
  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      AUTH_SERVER_URL: http://auth-server:3001
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/chat_db
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      LANGCHAIN_API_KEY: ${LANGCHAIN_API_KEY}
      LANGCHAIN_PROJECT: ${LANGCHAIN_PROJECT}
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      retries: 5

  # ── ARQ Worker ─────────────────────────────────────────────────────────
  worker:
    build: ./backend
    command: arq workers.agent_worker.WorkerSettings
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/chat_db
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      LANGCHAIN_API_KEY: ${LANGCHAIN_API_KEY}
    depends_on:
      backend: { condition: service_healthy }
    deploy:
      replicas: 2     # scale workers independently

  # ── Next.js Frontend ───────────────────────────────────────────────────
  frontend:
    build: ./frontend
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      BACKEND_URL: http://backend:8000
    depends_on:
      backend: { condition: service_healthy }

  # ── Nginx Reverse Proxy ────────────────────────────────────────────────
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

---

## Step 1.2 — docker-compose.dev.yml (hot-reload override)

```yaml
# docker-compose.dev.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.dev.yml up

services:


  backend:
    volumes:
      - ./backend:/app
    command: uvicorn main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

---

## Step 1.3 — Nginx Config

```nginx
# nginx/nginx.conf
events { worker_connections 1024; }

http {
  upstream frontend    { server frontend:3000; }
  upstream backend     { server backend:8000; }

  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;  # redirect to HTTPS
  }

  server {
    listen 443 ssl;
    server_name your-domain.com;
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Frontend (catch-all)
    location / {
      proxy_pass http://frontend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
    }



    # SSE — must disable buffering!
    location /api/sse/ {
      proxy_pass http://frontend;
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 300s;
      proxy_set_header Connection '';
      chunked_transfer_encoding on;
    }
  }
}
```

---

## Step 1.4 — Dockerfiles

```dockerfile

```

```dockerfile
# ai-server/Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY package.json .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Step 1.5 — Quick Start

```bash
# Copy env
cp .env.example .env   # fill in secrets

# Start all
docker compose up -d

# Or dev mode with hot-reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Scale workers
docker compose up -d --scale worker=4

# Logs
docker compose logs -f worker
docker compose logs -f backend

# Health check
curl https://your-domain.com/health
```

## Verification Checklist

- [ ] `docker compose up -d` — all containers healthy
- [ ] `http://localhost` → redirects to login page
- [ ] Login → chat works end-to-end
- [ ] Worker container streams tokens via SSE
- [ ] `docker compose logs worker` shows task processing
- [ ] Scale to 4 workers: `docker compose up --scale worker=4`

> ➡️ Next: [02-env.md](./02-env.md)
