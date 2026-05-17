"""3-tier memory: working (PostgreSQL), summary (LLM), entity (Redis)."""

import redis.asyncio as aioredis
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from config import settings
from db.chat_history import get_conversation_messages


# ── Tier 1: Working memory — last N turns from PostgreSQL ─────────────


async def get_working_memory(conversation_id: str, user_id: str, limit: int = 5) -> list[BaseMessage]:
    """Load last N messages from PostgreSQL for Tier 1 working memory."""
    msgs = await get_conversation_messages(conversation_id, user_id, limit=limit)
    result: list[BaseMessage] = []
    for m in msgs:
        if m.role == "user":
            result.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            result.append(AIMessage(content=m.content))
        elif m.role == "system":
            result.append(SystemMessage(content=m.content))
        else:
            # Fallback for tool and other roles — treat as assistant
            result.append(AIMessage(content=m.content))
    return result


# ── Tier 2: Summary memory — auto-summarize via LLM ─────────────────────


def make_summary_memory(llm: ChatOpenAI | ChatAnthropic):
    """Use LLM to summarize old context, keeping recent 800 tokens."""
    from langchain_classic.memory.summary import ConversationSummaryMemory

    return ConversationSummaryMemory(llm=llm)


# ── Tier 3: Entity memory — Redis HSET, configurable TTL ────────────────


async def remember_entity(
    redis: aioredis.Redis, conv_id: str, key: str, value: str
) -> None:
    """Store key facts (vendor, invoice ID) extracted from conversation."""
    await redis.hset(f"session:{conv_id}:entities", key, value)
    await redis.expire(f"session:{conv_id}:entities", settings.entity_ttl_seconds)


async def recall_entity(
    redis: aioredis.Redis, conv_id: str, key: str
) -> str | None:
    """Recall entity without user having to repeat it."""
    val = await redis.hget(f"session:{conv_id}:entities", key)
    if val is None:
        return None
    return val.decode() if isinstance(val, bytes) else val


async def recall_all_entities(
    redis: aioredis.Redis, conv_id: str
) -> dict[str, str]:
    """Recall all entities for a conversation."""
    raw = await redis.hgetall(f"session:{conv_id}:entities")
    decoded = {}
    for k, v in raw.items():
        k_str = k.decode() if isinstance(k, bytes) else k
        v_str = v.decode() if isinstance(v, bytes) else v
        decoded[k_str] = v_str
    return decoded