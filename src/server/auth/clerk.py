# ai-server/auth/clerk.py
"""Clerk JWT verification dependency."""
import asyncio
import re
import structlog
from functools import lru_cache

import httpx
import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient, PyJWTError, PyJWKClientError

# Module-level JWKS client cache (keyed by issuer URL)
_jwks_cache: dict[str, PyJWKClient] = {}
logger = structlog.get_logger(__name__)


@lru_cache(maxsize=1)
def _get_issuer() -> str:
    """Resolve and cache the Clerk issuer URL once at startup."""
    from config import settings

    if settings.clerk_issuer_url:
        return settings.clerk_issuer_url.rstrip("/")
    if settings.clerk_frontend_api:
        return f"https://{settings.clerk_frontend_api}"

    # Last-resort fallback — parse from secret key
    if settings.clerk_secret_key and "@" in settings.clerk_secret_key:
        match = re.search(r"@([^/]+)", settings.clerk_secret_key)
        if match:
            logger.warning(
                "clerk_issuer_parsed_from_secret_key",
                note="This fallback is brittle — set clerk_issuer_url explicitly",
            )
            return f"https://{match.group(1)}"

    raise RuntimeError(
        "Clerk configuration missing — set CLERK_ISSUER_URL or CLERK_FRONTEND_API"
    )


def _get_jwks_client(issuer: str) -> PyJWKClient:
    """Get or create a cached PyJWKClient for the given issuer."""
    global _jwks_cache
    jwks_url = f"{issuer}/.well-known/jwks.json"

    if jwks_url not in _jwks_cache:
        _jwks_cache[jwks_url] = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_cache[jwks_url]


async def get_current_user(request: Request) -> str:
    """Verify Clerk JWT and return user_id (sub claim)."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[7:]
    from config import settings

    try:
        issuer = _get_issuer()
        jwks_client = _get_jwks_client(issuer)

        # Run synchronous PyJWKClient key lookup in a background thread to prevent event-loop block
        signing_key = await asyncio.to_thread(jwks_client.get_signing_key_from_jwt, token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.clerk_audience or None,
            issuer=issuer,
            leeway=60,
        )
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str) or not sub.strip():
            raise HTTPException(status_code=401, detail="Token missing valid 'sub' claim")
        
        # Clerk user IDs follow the user_<ulid> pattern
        if not sub.startswith("user_"):
            logger.warning("jwt_sub_unexpected_format", sub=sub)
        return sub

    except PyJWKClientError as e:
        logger.error("jwks_client_error", error=str(e), issuer=issuer)
        raise HTTPException(status_code=503, detail="Auth signature service unavailable")
    except httpx.RequestError as e:
        logger.error("jwks_request_failed", error=str(e), issuer=issuer)
        raise HTTPException(status_code=503, detail="Auth service unavailable")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer")
    except PyJWTError as e:
        logger.error("jwt_verification_failed", error_type=type(e).__name__, error=str(e))
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("unexpected_auth_error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error during authentication")


async def get_current_user_dep(request: Request) -> str:
    """FastAPI dependency wrapper — use this with Depends() for testability."""
    return await get_current_user(request)