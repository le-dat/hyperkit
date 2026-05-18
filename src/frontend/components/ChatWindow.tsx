"use client"
import { useState } from "react"
import { useChat } from "@/hooks/useChat"
import MessageBubble from "./MessageBubble"
import HumanGateModal from "./HumanGateModal"
import type { Message } from "@/hooks/useChat"

interface Props {
  conversationId: string | null
  initialMessages?: Message[]
  onFirstMessage?: () => void
}

export default function ChatWindow({ conversationId, initialMessages = [], onFirstMessage }: Props) {
  const [input, setInput] = useState("")
  const { messages, isLoading, humanGate, error, sendMessage, handleApprove, handleReject } =
    useChat(conversationId, initialMessages)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput("")
    const wasEmpty = messages.length === 0
    await sendMessage(msg)
    if (wasEmpty && onFirstMessage) onFirstMessage()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && !messages.some((m) => m.isStreaming) && (
          <div
            className="flex gap-1 px-4"
            role="status"
            aria-label="Loading"
            aria-busy="true"
          >
            <span
              className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]"
              style={{ backgroundColor: "var(--color-loading-dot)" }}
            />
            <span
              className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]"
              style={{ backgroundColor: "var(--color-loading-dot)" }}
            />
            <span
              className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]"
              style={{ backgroundColor: "var(--color-loading-dot)" }}
            />
          </div>
        )}
        {error && (
          <p
            className="text-sm px-4"
            role="alert"
            style={{ color: "var(--color-interactive-destructive)" }}
          >
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          autoComplete="off"
          className="flex-1 px-4 py-2 border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-50 disabled:bg-[var(--color-surface-muted)]"
          style={{
            backgroundColor: "var(--color-surface-base)",
            borderColor: "var(--color-border-default)",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 text-white rounded-[var(--radius-md)] disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-interactive-primary)",
            transitionDuration: "var(--motion-duration-instant)",
          }}
        >
          Send
        </button>
      </form>

      {/* Human Gate Modal */}
      {humanGate.waiting && <HumanGateModal onApprove={handleApprove} onReject={handleReject} />}
    </div>
  )
}