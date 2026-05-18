import axios from "axios";
import { MCPTool } from "@/types";

const API_BASE = "/api/mcp";

interface MCPServerStatus {
  name: string;
  transport: string;
  healthy: boolean;
  tools: number;
  last_check: string | null;
}

interface ApiSuccess<T> {
  data: T;
}

export const mcpService = {
  async getServers(): Promise<MCPTool[]> {
    try {
      const response = await axios.get<ApiSuccess<MCPServerStatus[]>>(`${API_BASE}/servers`);
      const servers = response.data.data;

      return servers.map((server) => ({
        id: server.name,
        name: server.name,
        description: `${server.transport} • ${server.tools} tools`,
        provider: "MCP",
        installed: server.healthy,
        status: server.healthy ? ("connected" as const) : ("disconnected" as const),
        category: server.transport,
        image: undefined,
      }));
    } catch (error) {
      console.error("Failed to fetch MCP servers:", error);
      return [];
    }
  },

  async connect(name: string): Promise<boolean> {
    try {
      await axios.post(`${API_BASE}/mcp/connect`, { name });
      return true;
    } catch (error) {
      console.error("Failed to connect MCP server:", error);
      return false;
    }
  },

  async disconnect(name: string): Promise<boolean> {
    try {
      await axios.post(`${API_BASE}/mcp/${name}/disconnect`);
      return true;
    } catch (error) {
      console.error("Failed to disconnect MCP server:", error);
      return false;
    }
  },
};