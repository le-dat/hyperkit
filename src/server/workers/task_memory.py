import os
import sys
from pathlib import Path

# Resolve server/ path so db and state can be imported
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import structlog
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from db.chat_history import get_conversation_messages
from state import recall_all_entities, remember_entity
from workers.task_context import TaskContext

WORKING_MEMORY_LIMIT = int(os.getenv("WORKING_MEMORY_LIMIT", "5"))


async def build_messages(ctx: TaskContext) -> list[HumanMessage | AIMessage | SystemMessage]:
    """Load conversation history and append the new user message, injecting remembered facts."""
    # 1. Fetch past conversation history (Tier 1 Working Memory)
    history_rows = await get_conversation_messages(
        ctx.conversation_id, ctx.user_id, limit=WORKING_MEMORY_LIMIT
    )
    messages: list[HumanMessage | AIMessage | SystemMessage] = [
        HumanMessage(content=r.content) if r.role == "user" else AIMessage(content=r.content)
        for r in history_rows
    ]

    # 2. Recall all stored entities (Tier 3 Entity Memory) from Redis
    try:
        entities = await recall_all_entities(ctx.redis, ctx.conversation_id)
        if entities:
            remembered_facts = "\n".join([f"- {k}: {v}" for k, v in entities.items()])
            memory_context = (
                "[REMEMBERED FACTS / BACKGROUND KNOWLEDGE]\n"
                "You have the following facts remembered from previous turns of this conversation:\n"
                f"{remembered_facts}\n\n"
                "INSTRUCTION: Use these remembered facts first to answer the user's prompt. "
                "Do NOT call MCP tools to fetch this information again unless the user explicitly "
                "asks you to refresh it, or if the stored information is incomplete or outdated."
            )
            # Prepend the system memory message at the very start of the conversation list
            messages.insert(0, SystemMessage(content=memory_context))
    except Exception as e:
        # Gracefully handle memory retrieval errors to prevent crashing the agent task
        logger = structlog.get_logger(__name__)
        logger.warning("agent_memory_recall_failed", error=str(e))

    # 3. Append the current user prompt
    messages.append(HumanMessage(content=ctx.message))
    return messages


class ExtractedFacts(BaseModel):
    """Structured Pydantic schema for dynamic fact/entity extraction."""
    facts: dict[str, str] = Field(
        default_factory=dict,
        description="Key-value pairs of important entities, preferences, paths, or database IDs discovered or confirmed in this turn."
    )


async def extract_and_remember_entities(ctx: TaskContext) -> None:
    """Uses LLM to extract key-value facts from the current turn and saves them to Redis."""
    try:
        from llm.router import get_llm, TaskType
        llm = get_llm(TaskType.SUMMARIZATION)
        
        structured_llm = llm.with_structured_output(ExtractedFacts)
        
        system_prompt = (
            "You are an advanced background memory processor. Your job is to review the user's message "
            "and the assistant's final response, and extract any critical key-value facts that are highly "
            "important to remember for future turns (e.g. project names, specific folder paths, invoice IDs, "
            "user configurations, preferred names, or software tools mentioned).\n"
            "Ensure the extracted keys are generic, lowercase, and concise. "
            "If no new facts are found, return an empty dictionary."
        )
        
        context_text = f"User: {ctx.message}\nAssistant: {ctx.full_response}"
        
        response = await structured_llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=context_text)
        ])
        
        if response and response.facts:
            logger = structlog.get_logger(__name__)
            logger.info("extracted_new_memory_entities", count=len(response.facts), keys=list(response.facts.keys()))
            for key, val in response.facts.items():
                await remember_entity(ctx.redis, ctx.conversation_id, key.strip().lower(), str(val).strip())
    except Exception as e:
        logger = structlog.get_logger(__name__)
        logger.warning("entity_extraction_failed", error=str(e))
