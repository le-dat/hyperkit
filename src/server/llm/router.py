"""Multi-provider LLM router."""

from enum import Enum

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

from config import settings


class TaskType(Enum):
    REASONING = "reasoning"
    SUMMARIZATION = "summarization"


# Cached lowercase provider — settings.llm_provider is static at runtime
_PROVIDER = settings.llm_provider.lower()


def get_llm(task_type: TaskType = TaskType.REASONING) -> ChatOpenAI | ChatAnthropic:
    """Return configured LLM for the given task type."""
    if _PROVIDER == "anthropic":
        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key or None,
            temperature=0.0,
        )
    elif _PROVIDER == "openai":
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key or None,
            temperature=0.0,
        )
    elif _PROVIDER == "local":
        if not settings.vllm_model:
            raise ValueError(
                "vllm_model must be set when llm_provider='local' — "
                "specify the model name hosted by your vLLM server"
            )
        return ChatOpenAI(
            model=settings.vllm_model,
            api_key="not-needed",
            base_url=settings.vllm_base_url,
            temperature=0.0,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {_PROVIDER}")