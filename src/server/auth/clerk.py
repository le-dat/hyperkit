# ai-server/auth/clerk.py
"""Clerk JWT verification dependency."""
import re
import structlog
from functools import lru_cache

import httpx
import jwt
from fastapi import HTTPException, Request
from jwt import ExpiredSignatureError, InvalidAudienceError, InvalidIssuerError


# Module-level JWKS client cache (keyed by issuer URL)
_jwks_cache: dict[str, "PyJWKClient"] = {}  # type: ignore[name-defined]


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
            structlog.get_logger().warning(
                "clerk_issuer_parsed_from_secret_key",
                note="This fallback is brittle — set clerk_issuer_url explicitly",
            )
            return f"https://{match.group(1)}"

    raise HTTPException(
        status_code=500,
        detail="Clerk configuration missing — set CLERK_ISSUER_URL or CLERK_FRONTEND_API",
    )


def _get_jwks_client(issuer: str) -> "PyJWKClient":  # type: ignore[name-defined]
    """Get or create a cached PyJWKClient for the given issuer."""
    global _jwks_cache
    jwks_url = f"{issuer}/.well-known/jwks.json"

    if jwks_url not in _jwks_cache:
        _jwks_cache[jwks_url] = jwt.PyJWKClient(jwks_url, cache_keys=True)
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
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.clerk_audience or None,
            issuer=issuer,
        )
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str) or not sub.strip():
            raise HTTPException(status_code=401, detail="Token missing valid 'sub' claim")
        # Clerk user IDs follow the user_<ulid> pattern
        if not sub.startswith("user_"):
            structlog.get_logger().warning("jwt_sub_unexpected_format", sub=sub)
        return sub

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidAudienceError:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    except InvalidIssuerError:
        raise HTTPException(status_code=401, detail="Invalid token issuer")
    except jwt.InvalidSignatureError as e:
        structlog.get_logger().error("jwt_signature_invalid", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid token signature")
    except jwt.DecodeError as e:
        structlog.get_logger().error("jwt_decode_error", error=str(e))
        raise HTTPException(status_code=401, detail="Malformed token")
    except httpx.RequestError as e:
        structlog.get_logger().error("jwks_request_failed", error=str(e), issuer=issuer)
        raise HTTPException(status_code=503, detail="Auth service unavailable")
    except HTTPException:
        raise
    except Exception as e:
        structlog.get_logger().error("jwt_verification_failed", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_dep(request: Request) -> str:
    """FastAPI dependency wrapper — use this with Depends() for testability."""
    return await get_current_user(request)