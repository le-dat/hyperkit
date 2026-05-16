# Step 02 — Backend Auth: Clerk JWT Verification

## Goal

- Verify Clerk JWTs in FastAPI.
- Cache Clerk JWKS (JSON Web Key Sets) in Redis for performance.
- Extract `user_id` (Clerk `sub`) from the token to associate with chat data.

---

## Step 2.1 — Install Dependencies

```bash
cd backend
pip install "pyjwt[crypto]" cryptography httpx
```

---

## Step 2.2 — JWT Verification Dependency

Implement the logic to fetch Clerk's public keys and verify incoming tokens using `PyJWKClient`.

```python
# ai-server/auth/clerk.py
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Request
from config import settings

# Cached JWKS client
_jwks_client: PyJWKClient | None = None

def _get_jwks_client(issuer: str) -> PyJWKClient:
    global _jwks_client
    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
    if not _jwks_client:
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client

async def get_current_user(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")

    token = auth_header[7:]
    
    # Determine issuer from settings
    issuer = settings.clerk_issuer_url or f"https://{settings.clerk_frontend_api}"

    try:
        jwks_client = _get_jwks_client(issuer)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.clerk_audience,
            issuer=issuer,
        )
        return payload["sub"]
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")
```

---

## Step 2.3 — Protect Routes

Apply the dependency to your routes.

```python
# ai-server/main.py (example)
from fastapi import Depends
from auth.clerk import verify_clerk_token

@app.get("/protected-route")
async def protected_endpoint(user: dict = Depends(verify_clerk_token)):
    return {"message": f"Hello User {user['sub']}", "user_id": user['sub']}
```

---

## Step 2.4 — Environment Variables (Backend)

Ensure your `.env` has the Clerk API URL:

```env
# ai-server/.env
CLERK_FRONTEND_API=your-app.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_...  # Optional: for backend-only actions
```

---

## Verification Checklist

- [ ] `verify_clerk_token` successfully decodes a valid token from the frontend.
- [ ] `user['sub']` matches the Clerk User ID.
- [ ] Expired tokens return `401 Unauthorized`.
- [ ] Requests without the `Authorization` header return `422 Unprocessable Entity` (or `401` if handled).

> ➡️ Next: [Step 03 — LangGraph Agent](./03-langgraph-agent.md)
