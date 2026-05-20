# ai-server/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.bootstrap import bootstrap
# Execute bootstrap first to set environment variables and configure logging
bootstrap()

from config import settings
from middleware.logging import log_requests
from routers import v1_router
from core.exceptions import setup_exception_handlers
from core.lifespan import lifespan

app = FastAPI(
    title="AI Chatbot Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware — fail fast if frontend_url is missing
if not settings.frontend_url:
    raise ValueError("frontend_url must be set — CORS cannot use a wildcard origin with credentials")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.middleware("http")(log_requests)
# Register global exception handlers
setup_exception_handlers(app)
# Routers
app.include_router(v1_router)