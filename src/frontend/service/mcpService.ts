/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseService } from "./baseService";
import { ApiSuccess } from "@/types/common/api-response";

export interface McpCatalogField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
  help_text: string | null;
}

export interface McpCatalogItem {
  name: string;
  label: string;
  description: string;
  auth_type: "public" | "api_key" | "oauth";
  category: string;
  icon: string | null;
  fields: McpCatalogField[];
  enabled: boolean;
  configured: boolean;
}

class McpService extends BaseService {
  constructor() {
    super();
    this.baseURL = "/api/mcp/v1/mcp";
    this.api.defaults.baseURL = this.baseURL;
  }

  async getCatalog(): Promise<McpCatalogItem[]> {
    const response = await this.get<ApiSuccess<McpCatalogItem[]>>("/catalog");
    return response.data || [];
  }

  async toggleMcp(name: string, enabled: boolean, secretKey?: string): Promise<ApiSuccess<any>> {
    return this.post<ApiSuccess<any>>("/toggle", {
      name,
      enabled,
      secret_key: secretKey,
    });
  }

  async deleteKey(name: string): Promise<ApiSuccess<any>> {
    return this.delete<ApiSuccess<any>>(`/${name}/key`);
  }

  /** @deprecated Use toggleMcp instead */
  async connect(name: string): Promise<ApiSuccess<any>> {
    return this.toggleMcp(name, true);
  }

  /** @deprecated Use toggleMcp instead */
  async disconnect(name: string): Promise<ApiSuccess<any>> {
    return this.toggleMcp(name, false);
  }
}

export const mcpService = new McpService();
export { McpService };