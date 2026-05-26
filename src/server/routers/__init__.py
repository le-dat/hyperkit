# ai-server/routers/__init__.py
from fastapi import APIRouter
from routers import system, agent, sse, history, mcp

v1_router = APIRouter(prefix="/v1")

# Mount sub-routers under /v1
v1_router.include_router(system.router, tags=["system"])
v1_router.include_router(agent.router)
v1_router.include_router(sse.router)
v1_router.include_router(history.router)
v1_router.include_router(mcp.router)
