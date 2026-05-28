"""MCP server metadata and registry type definitions."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class MCPServer:
    name: str
    transport: str  # "stdio" | "http"
    command: list[str] | None = None  # stdio only
    url: str | None = None  # http only
    enabled: bool = True
    tools: list[dict[str, Any]] = None
    is_healthy: bool = False
    last_check: datetime | None = None

    def __post_init__(self):
        if self.tools is None:
            self.tools = []
