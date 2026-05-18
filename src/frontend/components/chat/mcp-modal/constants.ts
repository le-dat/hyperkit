import { MCPTool } from "@/types";

export const PUBLIC_TOOLS: MCPTool[] = [
  {
    id: "mcp-1",
    name: "GitHub Integration",
    description:
      "Read/Write access to repositories, PRs, and issues. Manage code reviews and automate workflows.",
    provider: "GitHub",
    installed: false,
    version: "2.4.1",
    category: ["Development", "Git"],
  },
  {
    id: "mcp-2",
    name: "Google Workspace",
    description:
      "Access Gmail, Calendar, and Drive files. Sync emails, schedule meetings, and manage documents.",
    provider: "Google",
    installed: true,
    version: "3.1.0",
    category: "Productivity",
    lastConnected: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "mcp-3",
    name: "Postgres Database",
    description:
      "Execute SQL queries safely against your database. Full CRUD operations with migration support.",
    provider: "PostgreSQL",
    installed: false,
    version: "1.8.2",
    category: "Database",
  },
  {
    id: "mcp-4",
    name: "Uniswap V3",
    description:
      "Fetch pool data and execute swaps on mainnet/L2s. Real-time liquidity monitoring.",
    provider: "Uniswap",
    installed: false,
    version: "4.0.5",
    category: ["DeFi", "Trading"],
  },
  {
    id: "mcp-5",
    name: "Stripe Payments",
    description:
      "Manage payments, subscriptions, and invoices. Complete financial operations toolkit.",
    provider: "Stripe",
    installed: false,
    version: "2.9.3",
    category: "Finance",
  },
  {
    id: "mcp-6",
    name: "Slack Workspace",
    description:
      "Send messages and listen for channel events. Automate team communication workflows.",
    provider: "Slack",
    installed: false,
    version: "5.2.0",
    category: "Communication",
  },
];

export const INSTALLED_TOOLS: MCPTool[] = [
  {
    id: "mcp-installed-1",
    name: "GitHub",
    description:
      "Access GitHub repositories, issues, and pull requests. Full repository management capabilities.",
    provider: "GitHub Inc.",
    installed: true,
    version: "2.4.1",
    category: ["Development", "Git"],
    lastConnected: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
  },
  {
    id: "mcp-installed-2",
    name: "Slack",
    description:
      "Send messages and manage Slack channels. Real-time team communication automation.",
    provider: "Slack Technologies",
    installed: true,
    version: "5.2.0",
    category: "Communication",
    lastConnected: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "mcp-installed-3",
    name: "Notion",
    description:
      "Read and write Notion pages and databases. Complete workspace integration.",
    provider: "Notion Labs",
    installed: true,
    version: "1.5.8",
    category: "Productivity",
    lastConnected: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    // image: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
  },
];

export const CUSTOM_TOOLS: MCPTool[] = [];
