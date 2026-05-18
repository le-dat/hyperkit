import axios from "axios";
import { ApiServiceConfig } from "@/types";
import { SendChatDto } from "@/types/api/chat";
import {
  GetConversationsParams,
  GetConversationsSuccess,
  GetMessagesParams,
  GetMessagesSuccess,
} from "@/types/api/conversations";
import { ApiSuccess } from "@/types/common/api-response";
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
      const response = await axios.post<ApiSuccess<InvokeAgentResponse>>(
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
      // Backend returns ApiSuccess(data=InvokeResponse), unwrap to get just the data
      return response.data.data;
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

  async deleteConversation(conversationId: string): Promise<ApiError | { success: true }> {
    try {
      return await this.delete<{ success: true }>(
        `/history/${conversationId}`
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<ApiError | { success: true }> {
    try {
      return await this.patch<{ success: true }>(
        `/history/${conversationId}`,
        { title }
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const chatApiService = new ChatService();
export { ChatService };