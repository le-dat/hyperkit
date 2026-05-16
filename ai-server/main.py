# ai-server/main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis

from config import settings
from db.models import Base, init_db

# Set LangSmith tracing env vars before importing LangChain
os.environ["LANGCHAIN_TRACING_V2"] = settings.langchain_tracing_v2
os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ─────────────────────────────────────────────────────────
    # DB: initialize engine/session from settings
    init_db(settings.database_url)
    from db.models import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Redis
    app.state.redis = await aioredis.from_url(settings.redis_url, decode_responses=True)
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────
    from db.models import engine as db_engine
    await app.state.redis.close()
    await db_engine.dispose()


app = FastAPI(title="AI Chatbot Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — added in later steps
# from routers import agent, sse, history, mcp
# app.include_router(agent.router)
# app.include_router(sse.router)
# app.include_router(history.router)
# app.include_router(mcp.router)


@app.get("/health")
async def health(request: Request):
    redis_ok = await request.app.state.redis.ping()
    return {"status": "ok", "redis": redis_ok}