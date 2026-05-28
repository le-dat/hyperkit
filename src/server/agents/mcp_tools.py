"""MCP tool builder — discovers and caches MCP server tools."""

from langchain_core.tools import StructuredTool

# Global MCP tools cache — built once at startup via build_mcp_tools()
_mcp_tools_cache: list["StructuredTool"] | None = None


async def build_mcp_tools() -> list["StructuredTool"]:
    """Discover all tools from registered MCP servers and wrap them as StructuredTools."""
    from mcp_registry.registry import registry

    mcp_tools_list = await registry.all_tools()
    result: list["StructuredTool"] = []
    for td in mcp_tools_list:
        server = td["_server"]
        name = td["name"]
        description = td.get("description", "")

        # Capture server/name via default args to avoid late-binding closure bugs
        async def call(server_: str = server, name_: str = name, **kwargs) -> str:
            r = await registry.call_tool(server_, name_, kwargs)
            content = r.get("content")
            if r.get("is_error"):
                raise RuntimeError(f"MCP tool error: {content or 'unknown error'}")
            # If content is empty or None, provide a fallback placeholder
            if not content:
                # Fallback response when MCP tool yields no result
                return "[No result returned from MCP tool]"
            return content

        result.append(
            StructuredTool.from_function(
                coroutine=call,
                name=name,
                description=description,
            )
        )
    return result


def set_mcp_tools(tools: list["StructuredTool"]) -> None:
    """Store globally so sync node_process can access them."""
    global _mcp_tools_cache
    _mcp_tools_cache = tools


def get_mcp_tools_cache() -> list["StructuredTool"] | None:
    return _mcp_tools_cache