"""MCP router — connect servers, list tools, check health."""

import os
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, model_validator
from sqlalchemy import select

from auth.clerk import get_current_user_dep
from agents.user_mcp_tools import invalidate_user_tools_cache
from core.rate_limit import check_rate_limit
from mcp_registry.registry import registry, MCPServer
from mcp_registry.catalog import MCP_CATALOG, MCPAuthType
from mcp_registry.crypto import encrypt_key
from db.models import AsyncSessionLocal, UserMcpConfig
from core.schemas import ApiSuccess


router = APIRouter(prefix="/mcp", tags=["mcp"])


class McpStatusResponse(BaseModel):
    status: str
    name: str


class McpHealthResponse(BaseModel):
    name: str
    healthy: bool

IS_PROD = os.getenv("ENV") in ("production", "prod")

# Only admins may register new MCP servers in production.
# In development, allow all authenticated users.
ALLOWED_ADMIN_USERS = set(os.getenv("MCP_ADMIN_USERS", "").split())  # empty = no restrictions


class ConnectReq(BaseModel):
    name: str
    transport: str | None = None
    command: list[str] | None = None
    url: str | None = None

    @model_validator(mode="after")
    def validate_all(self) -> "ConnectReq":
        # Name must be a simple identifier — no path traversal or special chars
        if not re.match(r"^[a-zA-Z0-9_-]+$", self.name):
            raise ValueError(f"Invalid server name: {self.name!r}")

        if self.transport is not None:
            if self.transport not in ("stdio", "http"):
                raise ValueError(f"Transport must be 'stdio' or 'http', got {self.transport!r}")

            if self.transport == "stdio":
                if not self.command:
                    raise ValueError("stdio transport requires command list")
                if not isinstance(self.command, list):
                    raise ValueError("command must be a list")
                if not all(isinstance(c, str) for c in self.command):
                    raise ValueError("command list must contain only strings")
                # Block dangerous commands (check all elements, not just the first)
                dangerous = {"sudo", "su", "pkexec", "chmod", "chown"}
                if any(elem in dangerous for elem in self.command):
                    raise ValueError(f"Blocked dangerous command element in: {self.command}")
            elif self.transport == "http":
                if not self.url:
                    raise ValueError("http transport requires url")
                if not self.url.startswith(("http://", "https://")):
                    raise ValueError("URL must use http or https scheme")

        return self


def _is_admin(user_id: str) -> bool:
    if not IS_PROD:
        return True  # Allow all in dev
    if not ALLOWED_ADMIN_USERS:
        return True  # No restriction configured = allow all
    return user_id in ALLOWED_ADMIN_USERS


@router.post("/connect", response_model=ApiSuccess[McpStatusResponse])
async def connect(req: ConnectReq, user: str = Depends(get_current_user_dep)):
    """Register and connect a new MCP server. Requires admin in production."""
    if not _is_admin(user):
        raise HTTPException(403, "Only admins may register MCP servers")

    # If already registered, reconnect it!
    if req.name in registry._servers:
        try:
            await registry.connect(req.name)
        except Exception as e:
            raise HTTPException(502, f"Failed to connect to MCP server: {e}")
        return ApiSuccess(data=McpStatusResponse(status="connected", name=req.name))

    # For new registration, transport must be provided
    if not req.transport:
        raise HTTPException(400, "transport field is required to register a new MCP server")

    registry.register(MCPServer(**req.model_dump(exclude_none=True)))
    try:
        await registry.connect(req.name)
    except Exception as e:
        # Roll back registration on failure
        registry._servers.pop(req.name, None)
        raise HTTPException(502, f"Failed to connect to MCP server: {e}")
    return ApiSuccess(data=McpStatusResponse(status="connected", name=req.name))


@router.post("/{name}/disconnect", response_model=ApiSuccess[McpStatusResponse])
async def disconnect(name: str, user: str = Depends(get_current_user_dep)):
    """Disconnect and unregister an MCP server."""
    if not _is_admin(user):
        raise HTTPException(403, "Only admins may modify MCP servers")

    if name not in registry._servers:
        raise HTTPException(404, f"Server '{name}' not registered")

    # Close session if open
    if name in registry._sessions:
        await registry.close_session(name)

    # Remove from registry
    del registry._servers[name]

    return ApiSuccess(data=McpStatusResponse(status="disconnected", name=name))


@router.get("/{name}/status", response_model=ApiSuccess[dict[str, Any]])
async def server_status(name: str, user: str = Depends(get_current_user_dep)):
    """Get status for a specific MCP server."""
    if name not in registry._servers:
        raise HTTPException(404, f"Server '{name}' not registered")
    status_list = registry.status()
    for s in status_list:
        if s["name"] == name:
            return ApiSuccess(data=s)
    raise HTTPException(404, f"Server '{name}' not found")


@router.post("/{name}/health", response_model=ApiSuccess[McpHealthResponse])
async def health_check(name: str, user: str = Depends(get_current_user_dep)):
    """Run a health check on a registered MCP server."""
    if name not in registry._servers:
        raise HTTPException(404, f"Server '{name}' not registered")
    ok = await registry.check_health(name)
    if not ok:
        raise HTTPException(503, f"Server '{name}' health check failed")
    return ApiSuccess(data=McpHealthResponse(name=name, healthy=True))


@router.get("/servers", response_model=ApiSuccess[list[dict[str, Any]]])
async def servers(user: str = Depends(get_current_user_dep)):
    """List all registered MCP servers and their health status."""
    return ApiSuccess(data=registry.status())


@router.get("/tools", response_model=ApiSuccess[list[dict[str, Any]]])
async def tools(user: str = Depends(get_current_user_dep)):
    """List all available tools from all connected MCP servers."""
    return ApiSuccess(data=await registry.all_tools())


# ── User-Specific Dynamic Catalog & Toggle Endpoints (Multi-Tenant) ──

async def get_user_configs(user_id: str) -> dict[str, UserMcpConfig]:
    """Helper to fetch all mcp configurations for a specific user."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserMcpConfig).filter_by(user_id=user_id)
        )
        rows = result.scalars().all()
        return {r.server_name: r for r in rows}


@router.get("/catalog", response_model=ApiSuccess[list[dict[str, Any]]])
async def get_catalog(user: str = Depends(get_current_user_dep)):
    """Get the master catalog of all supported MCP servers with user-specific enabled & configured status."""
    configs = await get_user_configs(user)
    
    result = []
    for name, item in MCP_CATALOG.items():
        user_cfg = configs.get(name)
        enabled = user_cfg.enabled if user_cfg else False
        configured = bool(user_cfg.encrypted_secret) if user_cfg else False
        
        result.append({
            "name": item.name,
            "label": item.label,
            "description": item.description,
            "auth_type": item.auth_type.value,
            "category": item.category,
            "icon": item.icon,
            "fields": [f.model_dump() for f in item.fields],
            "enabled": enabled,
            "configured": configured
        })
        
    return ApiSuccess(data=result)


class ToggleMcpReq(BaseModel):
    name: str
    enabled: bool
    secret_key: Optional[str] = None


@router.post("/toggle", response_model=ApiSuccess[dict[str, Any]])
async def toggle_mcp(
    req: ToggleMcpReq,
    request: Request,
    user: str = Depends(get_current_user_dep),
):
    # Rate limit: 10 toggle requests per user per 60 seconds
    allowed, _, retry_after = await check_rate_limit(
        request.app.state.redis_cache,
        f"mcp-toggle:{user}",
        limit=10,
        window_seconds=60,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )

    if req.name not in MCP_CATALOG:
        raise HTTPException(404, f"Server '{req.name}' not found in catalog")
        
    catalog_item = MCP_CATALOG[req.name]
    
    async with AsyncSessionLocal() as db_session:
        # Find existing config or create new
        result = await db_session.execute(
            select(UserMcpConfig).filter_by(user_id=user, server_name=req.name)
        )
        db_cfg = result.scalar_one_or_none()
        
        if not db_cfg:
            db_cfg = UserMcpConfig(user_id=user, server_name=req.name, enabled=False)
            db_session.add(db_cfg)
            
        if req.enabled:
            # If server requires keys, ensure a key is configured/provided
            if catalog_item.auth_type == MCPAuthType.API_KEY:
                if req.secret_key:
                    # Encrypt and save new key
                    encrypted = encrypt_key(req.secret_key)
                    db_cfg.encrypted_secret = encrypted
                elif not db_cfg.encrypted_secret:
                    raise HTTPException(400, f"API key is required to enable '{req.name}'")
            
            db_cfg.enabled = True
        else:
            # Disabling
            db_cfg.enabled = False
            # Close active subprocess connection for safety
            await registry.close_user_sessions(user)
            # Invalidate cached user MCP tools so next request picks up new config
            invalidate_user_tools_cache(user)
            
        await db_session.commit()
        await db_session.refresh(db_cfg)
        
        return ApiSuccess(data={
            "name": db_cfg.server_name,
            "enabled": db_cfg.enabled,
            "configured": bool(db_cfg.encrypted_secret)
        })


@router.post("/disconnect-all", response_model=ApiSuccess[dict[str, Any]])
async def disconnect_all_user_sessions(user: str = Depends(get_current_user_dep)):
    """Close and clean up all active user-specific MCP connections."""
    await registry.close_user_sessions(user)
    return ApiSuccess(data={"status": "disconnected_all"})


@router.delete("/{name}/key", response_model=ApiSuccess[dict[str, Any]])
async def delete_user_mcp_key(name: str, user: str = Depends(get_current_user_dep)):
    """Delete a saved API key and disable the MCP server for the user."""
    async with AsyncSessionLocal() as db_session:
        result = await db_session.execute(
            select(UserMcpConfig).filter_by(user_id=user, server_name=name)
        )
        db_cfg = result.scalar_one_or_none()
        if db_cfg:
            db_cfg.encrypted_secret = None
            db_cfg.enabled = False
            await registry.close_user_sessions(user)
            invalidate_user_tools_cache(user)
            await db_session.commit()
            
        return ApiSuccess(data={"status": "deleted", "name": name})