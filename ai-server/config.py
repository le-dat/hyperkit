from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth (Clerk)
    clerk_frontend_api: str = ""  # e.g. "your-app.clerk.accounts.dev"
    clerk_secret_key: str = ""  # for audit signing
    clerk_issuer_url: str = ""   # e.g. "https://clerk.your-domain.com"
    clerk_audience: str = "clerk"

    # Database (chat_db) — password must be provided via environment variable
    database_url: str = Field(
        "", 
        validation_alias=AliasChoices("DATABASE_URL", "CHAT_DATABASE_URL")
    )

    # Redis
    redis_url: str = "redis://localhost:6379"  # include password inline: redis://:pass@host:port

    # LLM
    llm_provider: str = "openai"  # "openai" | "anthropic" | "local"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    vllm_base_url: str = "http://localhost:8080/v1"  # on-premise

    # Guardrails
    max_cost_per_request_usd: float = 5.0
    max_tool_calls_per_session: int = 15

    # LangSmith
    langchain_tracing_v2: bool = True
    langchain_api_key: str = ""
    langchain_project: str = "ai-chatbot-prod"

    # Slack alerts
    slack_webhook_url: str = ""

    # CORS
    frontend_url: str = ""  # must be set — app fails fast if omitted in production

    # App
    max_conversations_limit: int = 50

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()