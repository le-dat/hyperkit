/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseService } from "./baseService";
import { MCPTool } from "@/types";
import { ApiSuccess } from "@/types/common/api-response";

export interface MCPServerStatus {
  name: string;
  transport: string;
  healthy: boolean;
  tools: number;
  last_check: string | null;
}

class McpService extends BaseService {
  constructor() {
    super();
    this.baseURL = "/api/mcp/v1/mcp";
    this.api.defaults.baseURL = this.baseURL;
  }

  async getServers(): Promise<MCPTool[]> {
    const response = await this.get<ApiSuccess<MCPServerStatus[]>>("/servers");
    const servers = response.data || [];

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
  }

  async connect(name: string): Promise<ApiSuccess<any>> {
    return this.post<ApiSuccess<any>>("/connect", { name });
  }

  async disconnect(name: string): Promise<ApiSuccess<any>> {
    return this.post<ApiSuccess<any>>(`/${name}/disconnect`);
  }
}

export const mcpService = new McpService();
export { McpService };