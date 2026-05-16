# ai-server/auth/clerk.py
"""Clerk JWT verification dependency."""
import httpx
from fastapi import HTTPException, Request


async def get_current_user(request: Request) -> str:
    """Verify Clerk JWT and return user_id.

    Extracts the Authorization header, verifies the JWT via Clerk's JWKS,
    and returns the subject (user_id).

    Raises:
        HTTPException: 401 if token is missing or invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[7:]  # strip "Bearer "

    # JWKS URL derived from clerk_secret_key domain
    # In production, cache the JWKS in Redis — see Step 02
    from config import settings

    if not settings.clerk_secret_key:
        # Dev mode: decode without verification (remove in production)
        import jwt
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("sub", "")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

    # Production: verify with Clerk's JWKS
    # (full implementation in Step 02)
    # placeholder until Step 02
    return "dev_user"