/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiResponseWithPagination, ApiSuccess } from "../common/api-response";
import { CursorPaginationParams } from "../common/pagination";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}
export type GetConversationsParams = CursorPaginationParams;
export type GetConversationsSuccess = ApiResponseWithPagination<Conversation[]>;

export type CreateConversationSuccess = ApiSuccess<Conversation>;
export type UpdateConversationSuccess = ApiSuccess<Conversation>;
export type DeleteConversationSuccess = ApiSuccess<null>;

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string[];
  timestamp: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type GetMessagesParams = CursorPaginationParams;
export type GetMessagesSuccess = ApiResponseWithPagination<Message[]>;

export type SendMessageDto = {
  conversationId: string;
  content: string;
};
export type SendMessageSuccess = ApiSuccess<Message>;

// UI Types for Chat Interface
export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  created_at: string;
  isStreaming?: boolean;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  lastMessageAt?: string | null;
}
