import type { Message } from "@/hooks/useChat"

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[75%] px-4 py-2 text-sm whitespace-pre-wrap"
        style={{
          backgroundColor: isUser
            ? "var(--color-message-user-bg)"
            : "var(--color-message-assistant-bg)",
          color: isUser
            ? "var(--color-message-user-text)"
            : "var(--color-message-assistant-text)",
          borderRadius: "var(--radius-lg)",
          borderBottomRightRadius: isUser ? "var(--radius-xs)" : "var(--radius-lg)",
          borderBottomLeftRadius: isUser ? "var(--radius-lg)" : "var(--radius-xs)",
        }}
      >
        {message.content}
        {message.isStreaming && (
          <span
            className="inline-block w-px h-4 bg-current ml-1 animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}