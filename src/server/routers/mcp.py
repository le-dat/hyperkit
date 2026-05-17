"""MCP router — connect servers, list tools, check health."""

import os
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, model_validator

from auth.clerk import get_current_user_dep
from mcp.registry import registry, MCPServer


router = APIRouter(prefix="/mcp", tags=["mcp"])

IS_PROD = os.getenv("ENV") in ("production", "prod")

# Only admins may register new MCP servers in production.
# In development, allow all authenticated users.
ALLOWED_ADMIN_USERS = set(os.getenv("MCP_ADMIN_USERS", "").split())  # empty = no restrictions


class ConnectReq(BaseModel):
    name: str
    transport: str
    command: list[str] | None = None
    url: str | None = None

    @model_validator(mode="after")
    def validate_all(self) -> "ConnectReq":
        # Name must be a simple identifier — no path traversal or special chars
        if not re.match(r"^[a-zA-Z0-9_-]+$", self.name):
            raise ValueError(f"Invalid server name: {self.name!r}")

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


@router.post("/connect")
async def connect(req: ConnectReq, user: str = Depends(get_current_user_dep)):
    """Register and connect a new MCP server. Requires admin in production."""
    if not _is_admin(user):
        raise HTTPException(403, "Only admins may register MCP servers")

    if req.name in registry._servers:
        raise HTTPException(409, f"Server '{req.name}' is already registered")

    registry.register(MCPServer(**req.model_dump()))
    try:
        await registry.connect(req.name)
    except Exception as e:
        # Roll back registration on failure
        registry._servers.pop(req.name, None)
        raise HTTPException(502, f"Failed to connect to MCP server: {e}")
    return {"status": "connected", "name": req.name}


@router.post("/{name}/disconnect")
async def disconnect(name: str, user: str = Depends(get_current_user_dep)):
    """Disconnect and unregister an MCP server."""
    if not _is_admin(user):
        raise HTTPException(403, "Only admins may modify MCP servers")

    if name not in registry._servers:
        raise HTTPException(404, f"Server '{name}' not registered")

    # Close session if open
    if name in registry._sessions:
        await registry._sessions[name].close()
        del registry._sessions[name]

    # Remove from registry
    del registry._servers[name]
    return {"status": "disconnected", "name": name}


@router.get("/{name}/status")
async def server_status(name: str, user: str = Depends(get_current_user_dep)):
    """Get status for a specific MCP server."""
    if name not in registry._servers:
        raise HTTPException(404, f"Server '{name}' not registered")
    status_list = registry.status()
    for s in status_list:
        if s["name"] == name:
            return s
    raise HTTPException(404, f"Server '{name}' not found")


@router.post("/{name}/health")
async def health_check(name: str, user: str = Depends(get_current_user_dep)):
    """Run a health check on a registered MCP server."""
    if name not in registry._servers:
        raise HTTPException(404, f"Server '{name}' not registered")
    ok = await registry.check_health(name)
    if not ok:
        raise HTTPException(503, f"Server '{name}' health check failed")
    return {"name": name, "healthy": True}


@router.get("/servers")
async def servers(user: str = Depends(get_current_user_dep)):
    """List all registered MCP servers and their health status."""
    return registry.status()


@router.get("/tools")
async def tools(user: str = Depends(get_current_user_dep)):
    """List all available tools from all connected MCP servers."""
    return await registry.all_tools()