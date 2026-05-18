export interface SendChatDto {
  conversationId?: string;
  content: string;
}

export enum StreamEventType {
  UserMessage = "user_message",
  ToolCallsStart = "tool_calls_start",
  ToolCall = "tool_call",
  ToolCallsEnd = "tool_calls_end",
  ContentStart = "content_start",
  ContentDelta = "content_delta",
  Content = "content",
  ContentEnd = "content_end",
  Done = "done",
  MessageComplete = "message_complete",
  Error = "error",
}

// Stream Event Data Types
export interface UserMessageEventData {
  id: string;
}

export interface ToolCallsStartEventData {
  count: number;
}

export interface ToolCallEventData {
  tool: string;
  status: "success" | "error" | "calling";
}

export interface ToolCallsEndEventData {
  results: unknown[];
}

export interface ContentDeltaEventData {
  delta: string;
}

export interface ContentEventData {
  text: string;
}

export interface DoneEventData {
  assistantMessageId: string;
}

export interface MessageCompleteEventData {
  assistantMessageId: string;
  toolCalls?: unknown[];
}

export interface ErrorEventData {
  message: string;
  code?: string;
}

export type StreamData =
  | { type: StreamEventType.UserMessage; data: UserMessageEventData }
  | { type: StreamEventType.ToolCallsStart; data: ToolCallsStartEventData }
  | { type: StreamEventType.ToolCall; data: ToolCallEventData }
  | { type: StreamEventType.ToolCallsEnd; data: ToolCallsEndEventData }
  | { type: StreamEventType.ContentStart; data: Record<string, never> }
  | { type: StreamEventType.ContentDelta; data: ContentDeltaEventData }
  | { type: StreamEventType.Content; data: ContentEventData }
  | { type: StreamEventType.ContentEnd; data: Record<string, never> }
  | { type: StreamEventType.Done; data: DoneEventData }
  | { type: StreamEventType.MessageComplete; data: MessageCompleteEventData }
  | { type: StreamEventType.Error; data: ErrorEventData };

// export interface PromptLibrary {
//   id: string;
//   user_id: string;
//   title: string;
//   prompt: string;
//   description: string | null;
//   tool_calls: ToolCall[] | null;
//   tags: string[];
//   is_public: boolean;
//   usage_count: number;
//   created_at: string;
//   updated_at: string;
// }

// export interface PromptLibraryListResponse {
//   prompt_libraries: PromptLibrary[];
//   pagination: {
//     total: number;
//     page: number;
//     page_size: number;
//     total_pages: number;
//   };
// }

// export type PromptLibraryResponse = ApiSuccess<PromptLibrary>;

// export interface CreatePromptLibraryRequest {
//   title: string;
//   prompt: string;
//   description?: string;
//   tool_calls?: ToolCall[];
//   tags?: string[];
//   is_public?: boolean;
// }

// export interface UpdatePromptLibraryRequest extends Partial<CreatePromptLibraryRequest> {
//   id: string;
// }
