# Step 07 — MCP Integration

## Goal

Dynamically register and use MCP (Model Context Protocol) servers as LangGraph tools:
- Transport types: stdio, HTTP
- Health monitoring
- Auto-discover tools from connected servers

---

## File Structure

```
ai-server/
└── mcp/
    ├── registry.py  ← server registry + connect + health
    └── client.py    ← transport abstraction
```

---

## Step 7.1 — MCP Registry

```python
# ai-server/mcp/registry.py
from dataclasses import dataclass, field
from datetime import datetime
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


@dataclass
class MCPServer:
    name: str
    transport: str                        # "stdio" | "http"
    command: list[str] | None = None      # stdio only
    url: str | None = None                # http only
    enabled: bool = True
    tools: list[dict] = field(default_factory=list)
    is_healthy: bool = False
    last_check: datetime | None = None


class MCPRegistry:
    def __init__(self):
        self._servers: dict[str, MCPServer]  = {}
        self._sessions: dict[str, ClientSession] = {}

    def register(self, server: MCPServer):
        self._servers[server.name] = server

    async def connect(self, name: str) -> ClientSession:
        if name in self._sessions:
            return self._sessions[name]

        cfg = self._servers[name]
        if cfg.transport == "stdio":
            params = StdioServerParameters(command=cfg.command[0], args=cfg.command[1:])
            read, write = await stdio_client(params).__aenter__()
        elif cfg.transport == "http":
            from mcp.client.http import http_client
            read, write = await http_client(cfg.url).__aenter__()
        else:
            raise ValueError(f"Unknown transport: {cfg.transport}")

        session = ClientSession(read, write)
        await session.initialize()
        self._sessions[name] = session

        # Discover tools
        result = await session.list_tools()
        cfg.tools = [t.model_dump() for t in result.tools]
        cfg.is_healthy = True
        cfg.last_check = datetime.utcnow()
        return session

    async def call_tool(self, server: str, tool: str, args: dict) -> dict:
        s = await self.connect(server)
        r = await s.call_tool(tool, arguments=args)
        return {"content": r.content, "is_error": r.isError}

    async def all_tools(self) -> list[dict]:
        return [
            {**t, "_server": name}
            for name, cfg in self._servers.items()
            if cfg.enabled
            for t in cfg.tools
        ]

    def status(self) -> list[dict]:
        return [
            {"name": c.name, "transport": c.transport,
             "healthy": c.is_healthy, "tools": len(c.tools),
             "last_check": c.last_check.isoformat() if c.last_check else None}
            for c in self._servers.values()
        ]


# ── Default servers ────────────────────────────────────────────────────
registry = MCPRegistry()

registry.register(MCPServer(
    name="web_search", transport="stdio",
    command=["npx", "-y", "@modelcontextprotocol/server-brave-search"],
))
registry.register(MCPServer(
    name="filesystem", transport="stdio",
    command=["npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp/agent-workspace"],
))
```

---

## Step 7.2 — MCP Router

```python
# ai-server/routers/mcp.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.verify import verify_token
from mcp.registry import registry, MCPServer

router = APIRouter(prefix="/mcp", tags=["mcp"])


class ConnectReq(BaseModel):
    name: str
    transport: str
    command: list[str] | None = None
    url: str | None = None


@router.post("/connect")
async def connect(req: ConnectReq, user=Depends(verify_token)):
    registry.register(MCPServer(**req.model_dump()))
    await registry.connect(req.name)
    return {"status": "connected", "name": req.name}


@router.get("/servers")
async def servers(user=Depends(verify_token)):
    return registry.status()


@router.get("/tools")
async def tools(user=Depends(verify_token)):
    return await registry.all_tools()
```

---

## Step 7.3 — Bind MCP Tools to LangGraph

```python
# ai-server/agents/supervisor.py — add at startup
from langchain_core.tools import StructuredTool
from mcp.registry import registry

async def build_mcp_tools() -> list:
    mcp_tools = await registry.all_tools()
    result = []
    for td in mcp_tools:
        server = td["_server"]
        name   = td["name"]
        async def call(s=server, n=name, **kw):
            return await registry.call_tool(s, n, kw)
        result.append(StructuredTool.from_function(
            coroutine=call,
            name=name,
            description=td.get("description", ""),
        ))
    return result

# Then in node_process:
# tools = await build_mcp_tools()
# llm_with_tools = get_llm(TaskType.REASONING).bind_tools(tools)
```

---

## Verification

```bash
# 1. Start FastAPI and Check Servers
curl http://localhost:8000/mcp/servers \
  -H "Authorization: Bearer <token>"
# → [{"name":"web_search","healthy":true,"tools":3,...}]

# 2. List all Tools
curl http://localhost:8000/mcp/tools \
  -H "Authorization: Bearer <token>"
# → list of available tools from all servers
```

> ➡️ Next: [Step 08 — Observability & Monitoring](./08-observability.md)
