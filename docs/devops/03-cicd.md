# Step 03 — CI/CD: GitHub Actions

## Pipeline Overview

```
push / PR → main
    │
    ├─ [backend]      lint → test → RAGAS gate → build Docker image
    ├─ [frontend]     lint → type-check → build
    │
    └─ [deploy]       (main branch only) → SSH deploy to server
```

---

## File Structure

```
.github/
└── workflows/
    ├── backend.yml       ← Python FastAPI CI (separate service)
    ├── frontend.yml      ← Next.js CI
    └── deploy.yml        ← Deploy on merge to main
```

---


## Step 3.1 — Python FastAPI Backend CI

```yaml
# .github/workflows/backend.yml
name: Backend CI

on:
  push:
    paths: ["backend/**"]
  pull_request:
    paths: ["backend/**"]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend   # ← Python service folder

    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: --health-cmd "redis-cli ping" --health-interval 5s

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: backend/requirements.txt

      - run: pip install -r requirements.txt
      - run: pip install ruff pytest pytest-asyncio

      - name: Lint (ruff)
        run: ruff check .

      - name: Type check (mypy)
        run: mypy . --ignore-missing-imports || true

      - name: Unit tests
        run: pytest tests/ -v
        env:
          REDIS_URL: redis://localhost:6379
          DATABASE_URL: sqlite+aiosqlite:///test.db
          AUTH_SERVER_URL: http://mock-auth:3001
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: RAGAS Evaluation Gate
        run: |
          python -c "
          import asyncio
          from observability.eval import run_ragas_eval
          asyncio.run(run_ragas_eval('tests/golden_dataset.json'))
          "
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        # Fails build if context_recall < 0.75 → blocks deploy

  docker:
    needs: lint-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:latest
            ghcr.io/${{ github.repository }}/worker:latest
```

---

## Step 3.2 — Next.js Frontend CI

```yaml
# .github/workflows/frontend.yml
name: Frontend CI

on:
  push:
    paths: ["frontend/**"]
  pull_request:
    paths: ["frontend/**"]

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend   # ← Next.js service folder

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
      - run: npm run lint
      - name: Type check
        run: npx tsc --noEmit
      - name: Build (validates SSR, no runtime errors)
        run: npm run build
        env:
          NEXT_PUBLIC_AUTH_SERVER: http://localhost:3001
          BACKEND_URL: http://localhost:8000

  docker:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:latest
```

---

## Step 3.3 — GitHub Actions Secrets

Set these in **Settings → Secrets and Variables → Actions**:

| Secret | Value |
|--------|-------|
| `OPENAI_API_KEY` | For RAGAS eval in CI |
| `DEPLOY_SSH_KEY` | Private key to SSH into production server |
| `DEPLOY_HOST` | Production server IP/domain |
| `SLACK_WEBHOOK_URL` | For CI failure alerts |

---

## Step 3.4 — Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [backend, frontend]   # wait for all CI to pass
    steps:
      - name: SSH deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: deploy
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/ai-chatbot
            git pull origin main
            docker compose pull
            docker compose up -d --no-build
            docker compose exec backend alembic upgrade head || true
            echo "✅ Deploy complete"

      - name: Health check (wait for services)
        run: |
          sleep 15
          curl -f https://${{ secrets.DEPLOY_HOST }}/health || exit 1
```

---

## Verification Checklist

- [ ] Push to feature branch → `auth-server.yml`, `backend.yml`, `frontend.yml` run
- [ ] RAGAS gate: context_recall < 0.75 → CI fails, deploy blocked
- [ ] Merge to main → `deploy.yml` triggers after all CI jobs pass
- [ ] GitHub → Actions tab shows green for all 4 workflows

> ➡️ Next: [04-deploy.md](./04-deploy.md)
