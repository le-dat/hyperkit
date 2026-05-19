import { SendChatDto } from "@/types/api/chat";
import {
  GetConversationsParams,
  GetConversationsSuccess,
  GetMessagesParams,
  GetMessagesSuccess,
} from "@/types/api/conversations";
import { ApiSuccess } from "@/types/common/api-response";
import { BaseService } from "./baseService";

export interface InvokeAgentResponse {
  turn_id: string;
  conversation_id: string;
  sse_url: string;
}

export interface DeleteConversationResponse {
  deleted: string;
}

export interface UpdateConversationTitleResponse {
  conversation_id: string;
}

const DEFAULT_CONFIG = {
  baseUrl: "/api/chat/v1",
  timeout: 30000,
  retryAttempts: 0,
  retryDelay: 3000,
};

class ChatService extends BaseService {
  private config: typeof DEFAULT_CONFIG;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseURL = this.config.baseUrl;
    this.api.defaults.baseURL = this.baseURL;
  }

  async invokeAgent(
    request: SendChatDto
  ): Promise<ApiSuccess<InvokeAgentResponse>> {
    return this.post<ApiSuccess<InvokeAgentResponse>>(
      "/agent/invoke",
      {
        conversation_id: request.conversationId || null,
        message: request.message,
      }
    );
  }

  async getConversations(
    params?: GetConversationsParams
  ): Promise<GetConversationsSuccess> {
    return this.get<GetConversationsSuccess>(
      "/history",
      params as Record<string, unknown>
    );
  }

  async getMessages(
    conversationId: string,
    params?: GetMessagesParams
  ): Promise<GetMessagesSuccess> {
    return this.get<GetMessagesSuccess>(
      `/history/${conversationId}`,
      params as Record<string, unknown>
    );
  }

  async deleteConversation(
    conversationId: string
  ): Promise<ApiSuccess<DeleteConversationResponse>> {
    return this.delete<ApiSuccess<DeleteConversationResponse>>(
      `/history/${conversationId}`
    );
  }

  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<ApiSuccess<UpdateConversationTitleResponse>> {
    return this.patch<ApiSuccess<UpdateConversationTitleResponse>>(
      `/history/${conversationId}`,
      { title }
    );
  }
}

export const chatApiService = new ChatService();
export { ChatService };