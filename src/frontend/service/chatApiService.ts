import axios from "axios";
import { ApiServiceConfig } from "@/types";
import { SendChatDto } from "@/types/api/chat";
import {
  GetConversationsParams,
  GetConversationsSuccess,
  GetMessagesParams,
  GetMessagesSuccess,
} from "@/types/api/conversations";
import { ApiError } from "@/types/common/api-response";
import { BaseService } from "./baseService";

const DEFAULT_CONFIG: ApiServiceConfig = {
  baseUrl: "/api/chat/v1",
  timeout: 30000,
  retryAttempts: 0,
  retryDelay: 3000,
};

export interface InvokeAgentResponse {
  turn_id: string;
  conversation_id: string;
  sse_url: string;
}

class ChatService extends BaseService {
  private config: ApiServiceConfig;

  constructor(config: Partial<ApiServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseURL = this.config.baseUrl;
    this.api.defaults.baseURL = this.baseURL;
  }

  async invokeAgent(
    request: SendChatDto
  ): Promise<InvokeAgentResponse | ApiError> {
    try {
      const response = await axios.post<InvokeAgentResponse>(
        `${this.baseURL}/agent/invoke`,
        {
          conversation_id: request.conversationId || null,
          message: request.message,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getConversations(
    params?: GetConversationsParams
  ): Promise<GetConversationsSuccess | ApiError> {
    try {
      return await this.get<GetConversationsSuccess>(
        "/history",
        params as Record<string, unknown>
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getMessages(
    conversationId: string,
    params?: GetMessagesParams
  ): Promise<GetMessagesSuccess | ApiError> {
    try {
      return await this.get<GetMessagesSuccess>(
        `/history/${conversationId}`,
        params as Record<string, unknown>
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Stub implementations - backend doesn't support these yet
  async deleteConversation(_conversationId: string): Promise<ApiError | { success: true }> {
    console.warn("deleteConversation not implemented on backend");
    return { success: true };
  }

  async updateConversationTitle(_conversationId: string, _title: string): Promise<ApiError | { success: true }> {
    console.warn("updateConversationTitle not implemented on backend");
    return { success: true };
  }
}

export const chatApiService = new ChatService();
export { ChatService };