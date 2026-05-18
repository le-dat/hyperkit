import { ApiServiceConfig } from "@/types";
import { SendChatDto, StreamData } from "@/types/api/chat";
import {
  CreateConversationSuccess,
  DeleteConversationSuccess,
  GetConversationsParams,
  GetConversationsSuccess,
  GetMessagesParams,
  GetMessagesSuccess,
  UpdateConversationSuccess,
} from "@/types/api/conversations";
import { ApiError } from "@/types/common/api-response";
import { BaseService } from "./baseService";

// Default configuration
const DEFAULT_CONFIG: ApiServiceConfig = {
  baseUrl: "/api/chat/v1",
  timeout: 60000 * 10, // 10 minutes
  retryAttempts: 0,
  retryDelay: 3000,
};
class ChatService extends BaseService {
  private config: ApiServiceConfig;

  constructor(config: Partial<ApiServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseURL = this.config.baseUrl;
    this.api.defaults.baseURL = this.baseURL;
  }

  // Safe fetch with timeout for streaming requests
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
      });
      return response;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error("Request aborted");
      }
      throw error;
    }
  }

  async getConversations(
    params?: GetConversationsParams,
  ): Promise<GetConversationsSuccess | ApiError> {
    try {
      return await this.get<GetConversationsSuccess>(
        "/conversations",
        params as Record<string, unknown>,
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createConversation(
    title?: string,
  ): Promise<CreateConversationSuccess | ApiError> {
    try {
      return this.post<CreateConversationSuccess>("/conversations", {
        title: title || "New Chat",
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getMessages(
    conversationId: string,
    params?: GetMessagesParams,
  ): Promise<GetMessagesSuccess | ApiError> {
    try {
      return this.get<GetMessagesSuccess>(
        `/conversations/${conversationId}/messages`,
        params as Record<string, unknown>,
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateConversationTitle(
    conversationId: string,
    title: string,
  ): Promise<UpdateConversationSuccess | ApiError> {
    try {
      return this.patch<UpdateConversationSuccess>(
        `/conversations/${conversationId}/title`,
        {
          title,
        },
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteConversation(
    conversationId: string,
  ): Promise<DeleteConversationSuccess | ApiError> {
    try {
      return this.delete<DeleteConversationSuccess>(
        `/conversations/${conversationId}`,
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Private helper to handle SSE stream response body
  private async handleStreamResponse(
    response: Response,
    onStreamData?: (data: StreamData) => void,
  ): Promise<void> {
    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmedLine = buffer.trim();

          // Handle [DONE] marker
          if (trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
            return;
          }

          if (trimmedLine.startsWith("data: ")) {
            const jsonStr = trimmedLine.slice(6);
            if (jsonStr && jsonStr !== "[DONE]") {
              try {
                const data = JSON.parse(jsonStr) as StreamData;
                if (onStreamData) {
                  onStreamData(data);
                }
              } catch (error) {
                if (jsonStr !== "[DONE]") {
                  console.error("Failed to parse final buffer:", error);
                }
              }
            }
          }
        }
        break;
      }

      // Decode chunk and append to buffer
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last line in buffer (might be incomplete)
      buffer = lines.pop() || "";

      // Process complete lines
      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(":")) {
          continue;
        }

        // Handle [DONE] marker (stream end signal)
        if (trimmedLine === "[DONE]" || trimmedLine === "data: [DONE]") {
          // Stream is done, exit gracefully
          return;
        }

        if (trimmedLine.startsWith("data: ")) {
          const jsonStr = trimmedLine.slice(6);
          if (jsonStr && jsonStr !== "[DONE]") {
            try {
              const data = JSON.parse(jsonStr) as StreamData;
              if (onStreamData) {
                onStreamData(data);
              }
            } catch (error) {
              // Only log if it's not [DONE] marker
              if (jsonStr !== "[DONE]") {
                console.error(
                  "Failed to parse SSE data:",
                  error,
                  "Raw:",
                  jsonStr,
                );
              }
            }
          }
        }
      }
    }
  }

  // Send chat message with streaming
  async sendChatMessage(
    request: SendChatDto,
    {
      onStreamData,
      onError,
      onSuccess,
      abortSignal,
    }: {
      onStreamData?: (data: StreamData) => void;
      onError?: (error: Error) => void;
      onSuccess?: () => void;
      abortSignal?: AbortSignal;
    },
  ): Promise<{ success: boolean; error?: string }> {
    if (!request.content) {
      const error = new Error("content is required");
      if (onError) onError(error);
      return { success: false, error: error.message };
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseURL}/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(request),
          signal: abortSignal,
        },
      );

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }

      await this.handleStreamResponse(response, onStreamData);
      if (onSuccess) {
        onSuccess();
      }
      return { success: true };
    } catch (error) {
      console.log("Failed to send chat message:", error);
      const err = error as Error;
      if (onError) {
        onError(err);
      }
      return {
        success: false,
        error: err.message,
      };
    }
  }

  // async reconnectToJob(
  //   conversationId: string,
  //   messageId: string,
  //   onStreamData?: (data: StreamData) => void,
  //   onError?: (error: Error) => void,
  //   abortSignal?: AbortSignal
  // ): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     const response = await this.fetchWithTimeout(
  //       `${this.baseURL}/reconnect/${conversationId}/${messageId}`,
  //       {
  //         method: "GET",
  //         headers: {
  //           Accept: "text/event-stream",
  //         },
  //         signal: abortSignal,
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error(`Reconnect failed: ${response.status}`);
  //     }

  //     await this.handleStreamResponse(response, onStreamData);

  //     return { success: true };
  //   } catch (error) {
  //     const err = error as Error;
  //     if (onError) {
  //       onError(err);
  //     }
  //     return {
  //       success: false,
  //       error: err.message,
  //     };
  //   }
  // }

  // Retry conversation message with streaming
  // async retryConversation(
  //   conversationId: string,
  //   onStreamData?: (data: StreamData) => void,
  //   onError?: (error: Error) => void,
  //   abortSignal?: AbortSignal
  // ): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     console.log("API Service retrying conversation:", conversationId);

  //     const response = await this.fetchWithTimeout(
  //       `${this.baseURL}/conversations/${conversationId}/retry`,
  //       {
  //         method: "POST",
  //         headers: {
  //           Accept: "text/event-stream",
  //         },
  //         signal: abortSignal,
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error(`Retry failed: ${response.status}`);
  //     }

  //     await this.handleStreamResponse(response, onStreamData);

  //     return { success: true };
  //   } catch (error) {
  //     const err = error as Error;
  //     if (onError) {
  //       onError(err);
  //     }
  //     return {
  //       success: false,
  //       error: err.message,
  //     };
  //   }
  // }

  // async cancelTask(
  //   conversationId: string,
  //   messageId: string
  // ): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     await this.post("/cancel-task", {
  //       conversation_id: conversationId,
  //       message_id: messageId,
  //     });
  //     return { success: true };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // Prompt Libraries
  // async getPromptLibraries(params?: {
  //   page?: number;
  //   page_size?: number;
  //   search?: string;
  //   tags?: string;
  //   include_public?: boolean;
  // }): Promise<PromptLibraryListResponse | { success: false; error: string }> {
  //   try {
  //     const data = await this.get<PromptLibraryListResponse>("/prompt-libraries", {
  //       page: params?.page || 1,
  //       page_size: params?.page_size || 50,
  //       search: params?.search,
  //       tags: params?.tags,
  //       include_public: params?.include_public,
  //     });
  //     return data;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // async createPromptLibrary(
  //   request: CreatePromptLibraryRequest
  // ): Promise<PromptLibraryResponse | ApiError> {
  //   try {
  //     const data = await this.post<PromptLibraryResponse>("/prompt-libraries", request);
  //     return data;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // async updatePromptLibrary(
  //   promptId: string,
  //   request: UpdatePromptLibraryRequest
  // ): Promise<PromptLibraryResponse | { success: false; error: string }> {
  //   try {
  //     const data = await this.put<PromptLibraryResponse>(`/prompt-libraries/${promptId}`, request);
  //     return data;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // async deletePromptLibrary(promptId: string): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     await this.delete(`/prompt-libraries/${promptId}`);
  //     return { success: true };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // async usePromptLibrary(promptId: string): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     await this.post(`/prompt-libraries/${promptId}/use`);
  //     return { success: true };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // async getPopularPromptLibraries(params?: {
  //   limit?: number;
  //   public_only?: boolean;
  // }): Promise<PromptLibraryResponse[] | { success: false; error: string }> {
  //   try {
  //     const data = await this.get<PromptLibraryResponse[]>("/prompt-libraries/popular/list", {
  //       limit: params?.limit,
  //       public_only: params?.public_only,
  //     });
  //     return data;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // async searchPromptLibrariesByTags(params: {
  //   tags: string;
  //   page?: number;
  //   page_size?: number;
  // }): Promise<PromptLibraryListResponse | { success: false; error: string }> {
  //   try {
  //     const data = await this.get<PromptLibraryListResponse>("/prompt-libraries/tags/search", {
  //       tags: params.tags,
  //       page: params?.page || 1,
  //       page_size: params?.page_size || 50,
  //     });
  //     return data;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }
}

// Export singleton instance
export const chatApiService = new ChatService();

// Export class for custom instances
export { ChatService };
