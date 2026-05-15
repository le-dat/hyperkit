# Step 04 — Production Deployment

## Production Folder Layout on Server

```
/opt/ai-chatbot/
├── backend/              ← Python FastAPI Service
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             ← Next.js Service
│   ├── Dockerfile
│   └── .next/
├── nginx/
│   ├── nginx.conf
│   └── certs/
├── infra/
│   └── init.sql
├── docker-compose.yml
└── .env                  ← production secrets (never in git)
```

---

## Step 4.1 — Server Initial Setup

```bash
# On production server (Ubuntu 22.04+)

# 1. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Install Docker Compose
sudo apt-get install docker-compose-plugin

# 3. Create deploy user (no root)
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# 4. Clone repo
sudo mkdir -p /opt/ai-chatbot
sudo chown deploy:deploy /opt/ai-chatbot
git clone https://github.com/your-org/ai-chatbot.git /opt/ai-chatbot

# 5. Create .env with production secrets
cp /opt/ai-chatbot/.env.example /opt/ai-chatbot/.env
nano /opt/ai-chatbot/.env    # fill in real secrets
```

---

## Step 4.2 — SSL with Let's Encrypt (Certbot)

```bash
sudo apt-get install certbot

# Obtain cert
sudo certbot certonly --standalone \
  -d your-domain.com \
  --agree-tos --non-interactive \
  -m your@email.com

# Certs go to
/etc/letsencrypt/live/your-domain.com/fullchain.pem
/etc/letsencrypt/live/your-domain.com/privkey.pem

# Copy to nginx/certs/
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/ai-chatbot/nginx/certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem   /opt/ai-chatbot/nginx/certs/

# Auto-renew cron
echo "0 0 * * * certbot renew --quiet && docker compose -f /opt/ai-chatbot/docker-compose.yml restart nginx" \
  | sudo crontab -
```

---

## Step 4.3 — Database Migrations

```bash
# Python backend: SQLAlchemy creates tables via Base.metadata.create_all on startup
# For future schema changes, use Alembic:
docker compose exec backend alembic upgrade head
```

---

## Step 4.4 — First Deploy

```bash
cd /opt/ai-chatbot

# Build and start all services
docker compose up -d --build

# Watch startup order: postgres → redis → backend → worker → frontend → nginx
docker compose ps
# All should show: Up (healthy)

# Run DB migrations
docker compose exec backend alembic upgrade head || true
```

---

## Step 4.5 — Health Check Script

```bash
#!/bin/bash
# /opt/ai-chatbot/healthcheck.sh

DOMAIN="https://your-domain.com"
ERRORS=0

# Frontend
curl -sf "$DOMAIN" > /dev/null || { echo "❌ Frontend down"; ERRORS=$((ERRORS+1)); }

# Backend (via Next.js proxy)
curl -sf "$DOMAIN/api/health" > /dev/null || { echo "❌ Backend down"; ERRORS=$((ERRORS+1)); }


# Redis
docker compose exec redis redis-cli ping | grep -q PONG \
  || { echo "❌ Redis down"; ERRORS=$((ERRORS+1)); }

# PostgreSQL
docker compose exec postgres pg_isready -U chatbot > /dev/null \
  || { echo "❌ PostgreSQL down"; ERRORS=$((ERRORS+1)); }

if [ "$ERRORS" -eq 0 ]; then
  echo "✅ All services healthy"
else
  echo "❌ $ERRORS service(s) unhealthy"
  # Send Slack alert
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🚨 $ERRORS service(s) down on $DOMAIN\"}"
fi
```

```bash
# Schedule health check every 5 min
echo "*/5 * * * * /opt/ai-chatbot/healthcheck.sh >> /var/log/healthcheck.log 2>&1" \
  | crontab -
```

---

## Step 4.6 — Update/Rollback

```bash
# Deploy new version
cd /opt/ai-chatbot
git pull origin main
docker compose pull        # pull pre-built images from CI
docker compose up -d       # rolling restart (no downtime)

# Rollback (if something breaks)
git revert HEAD --no-edit
git push origin main       # triggers CI → redeploy

# Or manually rollback image
docker compose down
docker image tag ghcr.io/.../backend:previous ghcr.io/.../backend:latest
docker compose up -d
```

---

## Step 4.7 — Log Management

```bash
# Tail logs by service
docker compose logs -f backend        # FastAPI structured JSON logs
docker compose logs -f worker         # ARQ worker logs
docker compose logs -f frontend       # Next.js logs

# Structured log search (FastAPI uses JSON)
docker compose logs backend | jq 'select(.event == "agent_error")'
docker compose logs worker  | jq 'select(.cost_usd > 0.10)'

# Log rotation (prevent disk fill)
# In /etc/docker/daemon.json:
# { "log-driver": "json-file", "log-opts": { "max-size": "50m", "max-file": "3" } }
```

---

## Step 4.8 — Resource Limits

```yaml
# Add to docker-compose.yml under each service:
services:

  backend:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G

  worker:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2.0"
          memory: 2G    # LLM calls need more memory

  frontend:
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
```

---

---

## Step 4.9 — Hybrid Deployment: Vercel + VPS

When using **Clerk**, authentication is handled as a SaaS service. You no longer need to host an auth server on your VPS.

### 1. Vercel Configuration (Frontend)

On the Vercel Dashboard, add the following Clerk Environment Variables:

| Key | Value | Note |
|-----|-------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | From Clerk Dashboard |
| `CLERK_SECRET_KEY` | `sk_test_...` | From Clerk Dashboard |
| `BACKEND_URL` | `https://api.your-vps-domain.com` | **Internal** Server-to-Server |
**backend/.env:**
```env
CLERK_FRONTEND_API=your-app.clerk.accounts.dev
```

```nginx
server {
    server_name api.your-vps-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Important for SSE (avoids timeout)
        proxy_read_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

**backend/.env:**
```env
FRONTEND_URL=https://your-app.vercel.app
# or if using same-origin nginx proxy:
FRONTEND_URL=https://your-vps-domain.com
```

---

## Production Checklist

| Category | Item | Status |
|----------|------|--------|
| Security | `CLERK_SECRET_KEY` is set | ☐ |
| Security | `POSTGRES_PASSWORD` is strong | ☐ |
| Security | SSL cert installed and auto-renew cron set | ☐ |
| Security | `.env` not in git (`.gitignore` has it) | ☐ |
| Security | CORS origins set to production Vercel URL | ☐ |
| DB | `chat_db` tables created | ☐ |
| Services | All containers show `healthy` in `docker ps` | ☐ |
| Services | `healthcheck.sh` returns "All services healthy" | ☐ |
| Monitoring | LangSmith dashboard accessible | ☐ |
| Monitoring | Prometheus `/metrics` responding | ☐ |
| Testing | `golden_dataset.json` has 100 Q&A pairs | ☐ |
| Deploy | CI/CD pushes to main auto-deploys | ☐ |

> ✅ **DevOps complete!** → See [security/01-security.md](../security/01-security.md) for hardening.
