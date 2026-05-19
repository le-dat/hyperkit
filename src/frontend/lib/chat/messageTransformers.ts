import {
  ChatMessage,
  ChatSession,
  Message,
  MessageRole,
} from "@/types";

export function transformConversationsToChatSessions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversations: any[],
): ChatSession[] {
  return conversations.map((conv) => ({
    id: conv.conversation_id || conv.id,
    title: conv.title,
    preview: "",
    lastMessageAt: conv.last_message_at || conv.updated_at,
  }));
}

export function transformMessagesToChatMessages(
  messages: Message[],
): ChatMessage[] {
  return messages.map((msg, index) => ({
    id: msg.id || `msg-${index}`,
    role:
      msg.role === MessageRole.USER ? MessageRole.USER : MessageRole.ASSISTANT,
    text: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
    thoughts: msg.thoughts,
    created_at: msg.created_at,
  }));
}
