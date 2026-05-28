from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.bootstrap import bootstrap
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.middleware("http")(log_requests)
setup_exception_handlers(app)
app.include_router(v1_router)