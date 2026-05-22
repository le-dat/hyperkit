from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel


class MCPAuthType(str, Enum):
    PUBLIC = "public"     # No user key needed, toggles on instantly
    API_KEY = "api_key"   # Needs user-provided token/key stored encrypted
    OAUTH = "oauth"       # OAuth flow (future expansion)


class McpField(BaseModel):
    key: str
    label: str
    type: str  # "text" | "password" | "textarea"
    placeholder: str
    required: bool = True
    help_text: Optional[str] = None


class McpCatalogItem(BaseModel):
    name: str
    label: str
    description: str
    auth_type: MCPAuthType
    category: str
    fields: list[McpField] = []
    icon: Optional[str] = None
    # Command arguments template or generator. Uses standard environment mapping.
    command: list[str]


# Master list of all supported MCP servers
MCP_CATALOG: dict[str, McpCatalogItem] = {
    # ── 1. PUBLIC SERVERS ───────────────────────────────────────────────
    "fetch": McpCatalogItem(
        name="fetch",
        label="Web Fetcher",
        description="Fetch content from any URL and convert the HTML to clean Markdown.",
        auth_type=MCPAuthType.PUBLIC,
        category="Utility",
        command=["npx", "-y", "mcp-server-fetch-typescript"],
        icon="Globe",
    ),
    "memory": McpCatalogItem(
        name="memory",
        label="Semantic Memory",
        description="A persistent Knowledge Graph that helps the chatbot remember details over time.",
        auth_type=MCPAuthType.PUBLIC,
        category="Core",
        command=["npx", "-y", "@modelcontextprotocol/server-memory"],
        icon="BrainCircuit",
    ),
    "puppeteer": McpCatalogItem(
        name="puppeteer",
        label="Browser Puppeteer",
        description="Full browser automation. Take screenshots, click buttons, and scrape websites.",
        auth_type=MCPAuthType.PUBLIC,
        category="Utility",
        command=["npx", "-y", "@modelcontextprotocol/server-puppeteer"],
        icon="MonitorPlay",
    ),
    "filesystem": McpCatalogItem(
        name="filesystem",
        label="Local Filesystem",
        description="Secure read/write access to your designated workspace directory.",
        auth_type=MCPAuthType.PUBLIC,
        category="System",
        command=["npx", "-y", "@modelcontextprotocol/server-filesystem"],
        icon="FolderOpen",
    ),

    # ── 2. API KEY SERVERS ──────────────────────────────────────────────
    "github": McpCatalogItem(
        name="github",
        label="GitHub Developer",
        description="Access repositories, create commits, manage pull requests, and review code.",
        auth_type=MCPAuthType.API_KEY,
        category="Development",
        icon="Github",
        command=["npx", "-y", "@modelcontextprotocol/server-github"],
        fields=[
            McpField(
                key="token",
                label="GitHub Personal Access Token",
                type="password",
                placeholder="ghp_...",
                help_text="Requires repo and read:user scopes.",
            )
        ],
    ),
    # "postgres": McpCatalogItem(
    #     name="postgres",
    #     label="PostgreSQL Database",
    #     description="Query, explore schemas, and perform operations on a PostgreSQL database.",
    #     auth_type=MCPAuthType.API_KEY,
    #     category="Database",
    #     icon="Database",
    #     command=["npx", "-y", "@modelcontextprotocol/server-postgres"],
    #     fields=[
    #         McpField(
    #             key="connection_string",
    #             label="Database Connection URL",
    #             type="text",
    #             placeholder="postgresql://username:password@localhost:5432/db",
    #             help_text="Provide a valid PostgreSQL connection URI.",
    #         )
    #     ],
    # ),
    # "google_maps": McpCatalogItem(
    #     name="google_maps",
    #     label="Google Maps API",
    #     description="Search for places, calculate transit routes, and perform geocoding operations.",
    #     auth_type=MCPAuthType.API_KEY,
    #     category="Productivity",
    #     icon="MapPin",
    #     command=["npx", "-y", "@modelcontextprotocol/server-google-maps"],
    #     fields=[
    #         McpField(
    #             key="api_key",
    #             label="Google Maps API Key",
    #             type="password",
    #             placeholder="AIzaSy...",
    #             help_text="Ensure Places API and Directions API are enabled.",
    #         )
    #     ],
    # ),
    "slack": McpCatalogItem(
        name="slack",
        label="Slack Workspace",
        description="Communicate with Slack. Read messages, list channels, and post directly to channels.",
        auth_type=MCPAuthType.API_KEY,
        category="Communication",
        icon="MessageSquare",
        command=["npx", "-y", "@modelcontextprotocol/server-slack"],
        fields=[
            McpField(
                key="bot_token",
                label="Slack Bot Token",
                type="password",
                placeholder="xoxb-...",
                help_text="Requires channels:read, chat:write, and groups:read scopes.",
            )
        ],
    ),
    "web_search": McpCatalogItem(
        name="web_search",
        label="Brave Web Search",
        description="Search the live web to fetch real-time search results, pages, and answers.",
        auth_type=MCPAuthType.API_KEY,
        category="Utility",
        icon="Search",
        command=["npx", "-y", "@modelcontextprotocol/server-brave-search"],
        fields=[
            McpField(
                key="api_key",
                label="Brave Search API Key",
                type="password",
                placeholder="BS...",
                help_text="Get a free key at api.search.brave.com.",
            )
        ],
    ),

    # ── 3. OAUTH SERVERS (FUTURE EXPANSION) ──────────────────────────────
    # "notion": McpCatalogItem(
    #     name="notion",
    #     label="Notion Integration",
    #     description="Organize ideas, manage pages, and sync notion databases.",
    #     auth_type=MCPAuthType.OAUTH,
    #     category="Productivity",
    #     icon="Notebook",
    #     command=["npx", "-y", "@modelcontextprotocol/server-notion"],
    # ),
}
