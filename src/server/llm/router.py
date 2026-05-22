"""Multi-provider LLM router — caches LLM instances per task type."""

from functools import lru_cache
from enum import Enum

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel

from config import settings


class TaskType(Enum):
    REASONING = "reasoning"
    SUMMARIZATION = "summarization"


# Module-level LLM instance cache — avoids creating new connection pools per call.
_llm_cache: dict[TaskType, BaseChatModel] = {}


def get_llm(task_type: TaskType = TaskType.REASONING) -> BaseChatModel:
    """Return configured LLM for the given task type. Instances are cached."""
    if task_type in _llm_cache:
        return _llm_cache[task_type]

    # Read provider lazily (not at module import time) so env var changes take effect.
    provider = settings.llm_provider.lower()

    if provider == "anthropic":
        llm = ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key or None,
            base_url=settings.anthropic_base_url or None,
            temperature=0.0,
        )
    elif provider == "openai":
        llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key or None,
            temperature=0.0,
        )
    elif provider == "local":
        if not settings.vllm_model:
            raise ValueError(
                "vllm_model must be set when llm_provider='local' — "
                "specify the model name hosted by your vLLM server"
            )
        llm = ChatOpenAI(
            model=settings.vllm_model,
            api_key="not-needed",
            base_url=settings.vllm_base_url,
            temperature=0.0,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")

    _llm_cache[task_type] = llm
    return llm