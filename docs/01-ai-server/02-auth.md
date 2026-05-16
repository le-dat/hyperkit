# Step 02 — Backend Auth: Clerk JWT Verification

## Goal

- Verify Clerk JWTs in FastAPI.
- Cache Clerk JWKS (JSON Web Key Sets) in Redis for performance.
- Extract `user_id` (Clerk `sub`) from the token to associate with chat data.

---

## Step 2.1 — Install Dependencies

```bash
cd backend
pip install python-jose[cryptography] httpx
```

---

## Step 2.2 — JWT Verification Dependency

Implement the logic to fetch Clerk's public keys and verify incoming tokens.

```python
# ai-server/auth/clerk.py
import httpx
from jose import jwt
from fastapi import Header, HTTPException, Depends
from config import settings

# Clerk JWKS URL (cache this in production!)
CLERK_JWKS_URL = f"https://{settings.clerk_frontend_api}/.well-known/jwks.json"

async def get_clerk_public_keys():
    """Fetch public keys from Clerk. In production, cache this in Redis!"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(CLERK_JWKS_URL)
        resp.raise_for_status()
        return resp.json()["keys"]

async def verify_clerk_token(authorization: str = Header(...)) -> dict:
    """Dependency to verify Clerk JWT and return the payload."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid auth header. Expected 'Bearer <token>'")
    
    token = authorization.split(" ")[1]
    
    # Implementation Detail: In production, fetch keys once and cache in Redis for 1h
    keys = await get_clerk_public_keys()

    try:
        # jose will find the correct key from the 'keys' list based on 'kid' in header
        payload = jwt.decode(
            token, 
            keys, 
            algorithms=["RS256"], 
            audience=None, # Clerk tokens don't always have aud
            issuer=f"https://{settings.clerk_frontend_api}"
        )
        return payload # Contains 'sub' (user_id), 'email', etc.
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
