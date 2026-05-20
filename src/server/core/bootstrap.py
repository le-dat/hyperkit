# ai-server/core/bootstrap.py
import os
import structlog
from config import settings


def bootstrap() -> None:
    """Initialize system-wide environment variables and logger configuration.

    This function must be called before importing any LangChain or routing modules
    to ensure environment variables and logging configurations are fully loaded.
    """
    # Set LangSmith tracing env vars before importing LangChain
    if settings.langchain_tracing_v2 and settings.langchain_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
        os.environ["LANGCHAIN_PROJECT"] = settings.langchain_project
    else:
        os.environ["LANGCHAIN_TRACING_V2"] = "false"

    # Configure structlog — console renderer in development, JSON in production
    is_development = os.getenv("ENV") == "development"
    _processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    if is_development:
        _processors.append(structlog.dev.ConsoleRenderer())
    else:
        _processors.append(structlog.processors.JSONRenderer())
    structlog.configure(processors=_processors)
