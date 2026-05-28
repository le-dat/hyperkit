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
        label="Web Page Reader (Web Fetcher)",
        description="Downloads and reads the text content from a specific web link (URL) you provide, converting it into clean, readable text. Note: This tool CANNOT search the internet for news—it only reads the exact link you give it.",
        auth_type=MCPAuthType.PUBLIC,
        category="Utility",
        command=["npx", "-y", "mcp-server-fetch-typescript"],
        icon="Globe",
    ),
    "memory": McpCatalogItem(
        name="memory",
        label="Long-Term Memory (Semantic Memory)",
        description="Helps the chatbot remember important facts, your preferences, and details across different chat conversations using a Knowledge Graph so you don't have to repeat them.",
        auth_type=MCPAuthType.PUBLIC,
        category="Core",
        command=["npx", "-y", "@modelcontextprotocol/server-memory"],
        icon="BrainCircuit",
    ),
    "puppeteer": McpCatalogItem(
        name="puppeteer",
        label="Web Browser Automation (Puppeteer)",
        description="Allows the chatbot to control a web browser. It can open pages, click buttons, interact with websites, and take screenshots just like a real human.",
        auth_type=MCPAuthType.PUBLIC,
        category="Utility",
        command=["npx", "-y", "@modelcontextprotocol/server-puppeteer"],
        icon="MonitorPlay",
    ),
    # "filesystem": McpCatalogItem(
    #     name="filesystem",
    #     label="File & Folder Access (Local Filesystem)",
    #     description="Gives the chatbot secure access to read and write files in a specific folder on your computer.",
    #     auth_type=MCPAuthType.PUBLIC,
    #     category="System",
    #     command=["npx", "-y", "@modelcontextprotocol/server-filesystem"],
    #     icon="FolderOpen",
    # ),

    # ── 2. API KEY SERVERS ──────────────────────────────────────────────
    "github": McpCatalogItem(
        name="github",
        label="GitHub Code Manager",
        description="Connects to your GitHub account to let the chatbot manage repositories, create commits, review code, and manage pull requests.",
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
                help_text="Requires a Personal Access Token with 'repo' and 'read:user' scopes.",
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
    # "slack": McpCatalogItem(
    #     name="slack",
    #     label="Slack Messenger Integration",
    #     description="Allows the chatbot to read messages, list chat channels, and post messages directly into your Slack workspace.",
    #     auth_type=MCPAuthType.API_KEY,
    #     category="Communication",
    #     icon="MessageSquare",
    #     command=["npx", "-y", "@modelcontextprotocol/server-slack"],
    #     fields=[
    #         McpField(
    #             key="bot_token",
    #             label="Slack Bot Token",
    #             type="password",
    #             placeholder="xoxb-...",
    #             help_text="Requires a token with 'channels:read', 'chat:write', and 'groups:read' scopes.",
    #         )
    #     ],
    # ),
    "web_search": McpCatalogItem(
        name="web_search",
        label="Internet Search Engine (Brave Web Search)",
        description="Allows the chatbot to search the live internet for real-time information, weather, current events, and online answers. Required to fetch the latest data.",
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
                help_text="Get a free or paid API key at api.search.brave.com.",
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
