"use client"
import { useState, useCallback } from "react"
import HistorySidebar from "@/components/HistorySidebar"
import ChatWindow from "@/components/ChatWindow"
import { useHistory } from "@/hooks/useHistory"
import type { Message } from "@/hooks/useChat"

export default function ChatPage() {
  const [convId, setConvId] = useState<string | null>(null)
  const [preloadedMsgs, setPreloadedMsgs] = useState<Message[]>([])
  const { loadMessages, refresh } = useHistory()

  const handleSelect = useCallback(
    async (selectedConvId: string) => {
      setConvId(selectedConvId)
      const msgs = await loadMessages(selectedConvId)
      setPreloadedMsgs(
        msgs.map((m, i) => ({
          id: `hist-${i}`,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      )
    },
    [loadMessages]
  )

  const handleNew = useCallback(() => {
    setConvId(null)
    setPreloadedMsgs([])
  }, [])

  return (
    <div className="flex h-screen" style={{ backgroundColor: "var(--color-surface-base)" }}>
      <HistorySidebar activeId={convId} onSelect={handleSelect} onNew={handleNew} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header
          className="border-b px-6 py-3 flex items-center"
          style={{ borderColor: "var(--color-border-muted)" }}
        >
          <h1
            className="font-semibold"
            style={{
              color: "var(--color-text-primary)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            {convId ? "Conversation" : "New conversation"}
          </h1>
        </header>
        <ChatWindow
          key={convId ?? "new"}
          conversationId={convId}
          initialMessages={preloadedMsgs}
          onFirstMessage={() => {
            refresh()
          }}
        />
      </main>
    </div>
  )
}