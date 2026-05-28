"""MCP server registry entrypoint — exposes the unified registry instance and type definitions."""

from mcp_registry.types import MCPServer
from mcp_registry.multi_tenant import MultiTenantRegistry


class MCPRegistry(MultiTenantRegistry):
    """Unified Registry combining base static global services and multi-tenant capabilities."""
    pass


# ── Default global registry instance ────────────────────────────────────
registry = MCPRegistry()