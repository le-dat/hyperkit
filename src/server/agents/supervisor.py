"""LangGraph supervisor graph with AgentState and human-in-the-loop gating."""

from typing import TypedDict, Annotated
import operator
import os

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.tools import StructuredTool
from langgraph.graph import StateGraph, END

from state.checkpoint import checkpointer
from llm.router import get_llm, TaskType

# Configurable retry limit — can be overridden via environment variable
MAX_ATTEMPTS = int(os.getenv("AGENT_MAX_ATTEMPTS", "3"))

# Global MCP tools cache — built once at startup via build_mcp_tools()
_mcp_tools_cache: list[StructuredTool] | None = None


class AgentState(TypedDict):
    # Identifiers
    conversation_id: str
    turn_id: str
    user_id: str

    # Messages (Annotated = append-only, avoids race conditions)
    messages: Annotated[list, operator.add]

    # Task
    task: str
    result: str

    # Control flow
    attempts: int
    errors: list[str]
    approved: bool


async def get_user_mcp_tools(user_id: str) -> list[StructuredTool]:
    """Retrieve and build user-specific dynamic MCP tools."""
    from db.models import AsyncSessionLocal, UserMcpConfig
    from mcp_registry.crypto import decrypt_key
    from mcp_registry.registry import registry
    from sqlalchemy import select

    # 1. Fetch enabled user MCP configs
    async with AsyncSessionLocal() as db_session:
        result = await db_session.execute(
            select(UserMcpConfig).filter_by(user_id=user_id, enabled=True)
        )
        rows = result.scalars().all()

    # 2. Decrypt secrets and build customized environments
    user_tools: list[StructuredTool] = []
    for row in rows:
        custom_env = {}
        if row.encrypted_secret:
            try:
                decrypted = decrypt_key(row.encrypted_secret)
                if row.server_name == "postgres":
                    custom_env["PG_CONNECTION_STRING"] = decrypted
                elif row.server_name == "github":
                    custom_env["GITHUB_PERSONAL_ACCESS_TOKEN"] = decrypted
                elif row.server_name == "google_maps":
                    custom_env["GOOGLE_MAPS_API_KEY"] = decrypted
                elif row.server_name == "slack":
                    custom_env["SLACK_BOT_TOKEN"] = decrypted
                elif row.server_name == "web_search":
                    custom_env["BRAVE_API_KEY"] = decrypted
            except Exception as e:
                print(f"[Supervisor] Decryption failed for {row.server_name}: {e}", flush=True)
                continue

        # 3. Connect to user server and get tools
        try:
            session = await registry.connect_user(user_id, row.server_name, custom_env)
            server_key = (user_id, row.server_name)
            server_cfg = registry._user_servers[server_key]
            
            for td in server_cfg.tools:
                server_name = row.server_name
                name = td["name"]
                description = td.get("description", "")
                
                # Capture variables via default args to avoid late-binding closure bug
                async def call(server_=server_name, name_=name, env_=custom_env, **kwargs) -> str:
                    r = await registry.call_user_tool(user_id, server_, name_, kwargs, env_)
                    content = r.get("content", "")
                    if r.get("is_error"):
                        raise RuntimeError(f"MCP tool error: {content}")
                    return content
                
                user_tools.append(StructuredTool.from_function(
                    coroutine=call,
                    name=name,
                    description=description
                ))
        except Exception as e:
            print(f"[Supervisor] Failed to connect user server {row.server_name}: {e}", flush=True)
            continue

    return user_tools


async def node_process(state: AgentState) -> dict:
    """Main reasoning node — calls LLM with bound MCP tools and returns AI response."""
    try:
        llm = get_llm(TaskType.REASONING)
        
        all_tools = []
        if _mcp_tools_cache is not None:
            all_tools.extend(_mcp_tools_cache)
            
        user_id = state.get("user_id")
        if user_id:
            user_tools = await get_user_mcp_tools(user_id)
            all_tools.extend(user_tools)

        if all_tools:
            llm = llm.bind_tools(all_tools)
        
        system_msg = SystemMessage(
            content=(
                "Prior to writing your final response, you MUST output your step-by-step thinking process, search strategy, and planning inside <thought>...</thought> tags at the very beginning of your output. Once done, close the tag and write your final user-facing response."
            )
        )
        messages_to_send = [system_msg] + state["messages"]
        
        full_content = ""
        # Consume the stream to trigger on_chat_model_stream events
        async for chunk in llm.astream(messages_to_send):
            if chunk.content:
                if isinstance(chunk.content, list):
                    for block in chunk.content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            full_content += block.get("text", "")
                        elif isinstance(block, str):
                            full_content += block
                elif isinstance(chunk.content, str):
                    full_content += chunk.content
                else:
                    full_content += str(chunk.content)
        
        return {
            "messages": [AIMessage(content=full_content)],
            "result": full_content,
            "errors": [],
        }
    except Exception as e:
        print(f"[Supervisor Error] node_process failed: {e}", flush=True)
        import traceback
        traceback.print_exc()
        
        prior = state.get("errors", [])
        errors = [str(e)] + prior
        errors = errors[:3]
        return {
            "errors": errors,
            "attempts": min(state.get("attempts", 0) + 1, MAX_ATTEMPTS),
        }


def node_human_gate(state: AgentState) -> dict:
    """Human approval node — marks conversation as approved on resume."""
    return {"approved": True}


def route_after_process(state: AgentState) -> str:
    """Route based on state after process node runs."""
    if state.get("errors"):
        if state.get("attempts", 0) >= MAX_ATTEMPTS:
            return "end"
        return "process"
    if not state.get("approved", False):
        return "human_gate"
    return "end"


# ── Build graph ────────────────────────────────────────────────────────

builder = StateGraph(AgentState)
builder.add_node("process", node_process)
builder.add_node("human_gate", node_human_gate)

builder.set_entry_point("process")
builder.add_conditional_edges(
    "process",
    route_after_process,
    {
        "process": "process",
        "human_gate": "human_gate",
        "end": END,
    },
)
builder.add_edge("human_gate", END)

graph = builder.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_gate"],
)


# ── MCP tool builder — call once at startup ────────────────────────────


async def build_mcp_tools() -> list[StructuredTool]:
    """Discover all tools from registered MCP servers and wrap them as StructuredTools."""
    from mcp_registry.registry import registry

    mcp_tools_list = await registry.all_tools()
    result: list[StructuredTool] = []
    for td in mcp_tools_list:
        server = td["_server"]
        name = td["name"]
        description = td.get("description", "")

        # Capture server/name via default args to avoid late-binding closure bugs
        async def call(server_: str = server, name_: str = name, **kwargs) -> str:
            r = await registry.call_tool(server_, name_, kwargs)
            content = r.get("content", "")
            if r.get("is_error"):
                raise RuntimeError(f"MCP tool error: {content}")
            return content

        result.append(StructuredTool.from_function(
            coroutine=call,
            name=name,
            description=description,
        ))
    return result


def set_mcp_tools(tools: list[StructuredTool]) -> None:
    """Store globally so sync node_process can access them."""
    global _mcp_tools_cache
    _mcp_tools_cache = tools