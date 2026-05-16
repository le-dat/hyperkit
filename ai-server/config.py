# ai-server/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth (Clerk)
    clerk_frontend_api: str = ""  # e.g. "your-app.clerk.accounts.dev"
    clerk_secret_key: str = ""  # for audit signing

    # Database (chat_db) — password must be provided via environment variable
    database_url: str = ""  # e.g. postgresql+asyncpg://chatbot:<password>@localhost:5432/chat_db

    # Redis
    redis_url: str = "redis://localhost:6379"

    # LLM
    llm_provider: str = "openai"  # "openai" | "anthropic" | "local"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    vllm_base_url: str = "http://localhost:8080/v1"  # on-premise

    # Guardrails
    max_cost_per_request_usd: float = 5.0
    max_tool_calls_per_session: int = 15

    # LangSmith
    langchain_tracing_v2: str = "true"
    langchain_api_key: str = ""
    langchain_project: str = "ai-chatbot-prod"

    # Slack alerts
    slack_webhook_url: str = ""

    # CORS
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()