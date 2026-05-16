# ai-server/auth/clerk.py
"""Clerk JWT verification dependency."""
import httpx
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Request

# Module-level JWKS client (cached by PyJWKClient internally)
_jwks_client: PyJWKClient | None = None
_jwks_url: str | None = None


def _get_jwks_client(issuer: str) -> PyJWKClient:
    """Get or create a cached PyJWKClient for the given issuer."""
    global _jwks_client, _jwks_url
    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"

    if _jwks_client is None or _jwks_url != jwks_url:
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
        _jwks_url = jwks_url
    return _jwks_client


async def get_current_user(request: Request) -> str:
    """Verify Clerk JWT and return user_id."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[7:]

    from config import settings

    # Determine issuer
    if settings.clerk_issuer_url:
        issuer = settings.clerk_issuer_url
    elif settings.clerk_frontend_api:
        issuer = f"https://{settings.clerk_frontend_api}"
    else:
        # Fallback to parsing from secret key if absolutely necessary, but warn it's brittle
        if not settings.clerk_secret_key or "@" not in settings.clerk_secret_key:
            raise HTTPException(
                status_code=500,
                detail="Clerk configuration missing (issuer_url or frontend_api required)",
            )
        import re
        match = re.search(r"@([^/]+)", settings.clerk_secret_key)
        if not match:
            raise HTTPException(status_code=500, detail="Could not parse Clerk issuer")
        issuer = f"https://{match.group(1)}"

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
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Token missing 'sub' claim")
        return sub

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer")
    except Exception as e:
        # Log the full error for debugging
        import structlog
        structlog.get_logger().error("jwt_verification_failed", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid token")