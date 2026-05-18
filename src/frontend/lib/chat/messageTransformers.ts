import {
  ChatMessage,
  ChatSession,
  Conversation,
  Message,
  MessageRole,
} from "@/types";

export function transformConversationsToChatSessions(
  conversations: Conversation[],
): ChatSession[] {
  return conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    preview: "", // Could be enhanced with last message preview
    lastMessageAt: conv.last_message_at,
  }));
}

export function transformMessagesToChatMessages(
  messages: Message[],
): ChatMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role:
      msg.role === MessageRole.USER ? MessageRole.USER : MessageRole.ASSISTANT,
    text: Array.isArray(msg.content) ? msg.content.join(" ") : msg.content,
    created_at: msg.created_at,
  }));
}
