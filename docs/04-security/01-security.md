# Security Hardening

## Attack Surface Overview

```
Internet
  │
  ├─ [Nginx]       TLS termination, rate limit, header hardening
  │
  ├─ [Frontend]    Next.js — Clerk SDK, CSP headers, no secrets in client bundle
  │
  ├─ [Auth]        Clerk (Managed) — Session management, MFA, Bot protection
  │
  └─ [Backend]     FastAPI — Clerk JWT verify on EVERY request via JWKS
        ├─ Input guard: injection, PII, XML isolation
        ├─ Output guard: structured schema + retry with error feedback
        ├─ Tool guard: allowlist, loop detection, max calls
        ├─ Budget guard: cost cap + Slack alert
        └─ Audit log: HMAC-signed, append-only
```

---

## 1 — Network Isolation

### Docker Internal Network

```yaml
# docker-compose.yml — add network isolation
networks:
  public:      # only nginx exposed
  internal:    # services communicate internally, never exposed

services:
  nginx:
    networks: [public, internal]

  frontend:
    networks: [internal]   # NOT exposed directly

  backend:
    networks: [internal]   # NOT exposed directly

  worker:
    networks: [internal]

  postgres:
    networks: [internal]

  redis:
    networks: [internal]
```

> **Rule**: Only `nginx` listens on ports 80/443. All other services are internal.

---

## 2 — Nginx Security Headers

```nginx
# nginx/nginx.conf — add to server block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options            "DENY" always;
add_header X-Content-Type-Options     "nosniff" always;
add_header X-XSS-Protection           "1; mode=block" always;
add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy
  "default-src 'self'; script-src 'self'; connect-src 'self' wss:; img-src 'self' data:" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

location /api/ {
  limit_req zone=api burst=10 nodelay;
}
```

---

## 3 — Clerk Security Configuration

Clerk handles the majority of auth-related security. Recommended settings:

1.  **Session Duration**: Keep short-lived tokens (Clerk default is 1 min for JWTs) to minimize window of theft.
2.  **MFA**: Enable Multi-Factor Authentication (Email/SMS/TOTP) in Clerk Dashboard.
3.  **Bot Protection**: Enable Clerk's built-in bot detection and CAPTCHA.
4.  **JWT Templates**: Ensure the JWT payload contains the necessary claims (`sub`, `email`) and minimal sensitive data.

---

## 4 — FastAPI Per-Request Clerk Verification

```python
# ai-server/auth/clerk.py
# Every single FastAPI endpoint MUST use Depends(verify_clerk_token)
# FastAPI verifies the Clerk JWT signature against public keys (JWKS)

# ❌ NEVER do this:
@router.get("/history")
async def get_history():   # no auth = anyone can access
    ...

# ✅ Always do this:
@router.get("/history")
async def get_history(user=Depends(verify_clerk_token)):
    ...   # user['sub'] is verified and injected
```

### Caching JWKS (avoid network calls on every request)

```python
# ai-server/auth/clerk.py — with caching
import httpx
from jose import jwt
from fastapi import Header, HTTPException, Request

async def get_jwks(request: Request):
    """Fetch and cache Clerk JWKS in Redis for 1 hour."""
    redis = request.app.state.redis
    cached = await redis.get("clerk:jwks")
    if cached:
        import json
        return json.loads(cached)

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://{settings.clerk_frontend_api}/.well-known/jwks.json")
        keys = resp.json()["keys"]
        await redis.setex("clerk:jwks", 3600, json.dumps(keys))
        return keys

async def verify_clerk_token(request: Request, authorization: str = Header(...)) -> dict:
    token = authorization.replace("Bearer ", "")
    keys = await get_jwks(request)

    try:
        payload = jwt.decode(
            token, 
            keys, 
            algorithms=["RS256"],
            issuer=f"https://{settings.clerk_frontend_api}"
        )
        return payload
    except Exception:
        raise HTTPException(401, "Invalid or expired Clerk token")
```

---

## 5 — HMAC-Signed Audit Log

```python
# ai-server/guards/audit.py
import hmac, hashlib, json, time
from config import settings

# Use a secure secret key for signing audit logs
AUDIT_SECRET = settings.clerk_secret_key.encode() 


def write_audit_log(event: str, user_id: str, data: dict) -> dict:
    """
    Append-only audit log with HMAC signature.
    Any modification of the log invalidates the signature → tamper detection.
    """
    entry = {
        "timestamp": time.time(),
        "event":     event,
        "user_id":   user_id,
        "data":      data,
    }
    payload = json.dumps(entry, sort_keys=True).encode()
    sig = hmac.new(AUDIT_SECRET, payload, hashlib.sha256).hexdigest()
    entry["_sig"] = sig

    # Append to log (or write to PostgreSQL audit table)
    with open("audit.log", "a") as f:
        f.write(json.dumps(entry) + "\n")

    return entry
```

---

## 6 — Secrets Checklist

| Item | ✅ Secure | ❌ Insecure |
|------|-----------|------------|
| `CLERK_SECRET_KEY` | sk_live_... (Dashboard) | "secret" or "password" |
| `POSTGRES_PASSWORD` | Strong random | blank or "chatbot" |
| `.env` files | In `.gitignore` | Committed to git |
| `BACKEND_URL` | No `NEXT_PUBLIC_` | Has `NEXT_PUBLIC_` = exposed to browser |
| Clerk JWT | Short-lived (1 min) | Long expiration |
| DB connections | Internal Docker network only | Port 5432 exposed to internet |
| Redis | Internal Docker network only | Port 6379 exposed to internet |

---

## 7 — Security Scanning

```bash
# Python dependencies
pip install pip-audit
pip-audit -r ai-server/requirements.txt

# Node dependencies
cd frontend && npm audit

# Docker image scan
docker scout cves ghcr.io/your-org/backend:latest

# OWASP ZAP (automated web security scan)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-domain.com -r report.html
```
