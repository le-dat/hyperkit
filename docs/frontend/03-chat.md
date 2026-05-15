# Step 03 — Chat UI: useChat Hook + SSE Streaming + Human Gate

## Goal

- `useChat` hook: send message → invoke → SSE streaming → render tokens
- Human gate modal: agent pauses, user approves/rejects
- ChatWindow + MessageBubble components

---

## Step 3.1 — useChat Hook

```ts
// hooks/useChat.ts
"use client"
import { useState, useCallback, useRef } from "react"
import { getToken } from "@/lib/auth"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
}

interface HumanGate {
  waiting: boolean
  turnId: string | null
}

export function useChat(conversationId: string | null) {
  const [messages, setMessages]     = useState<Message[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [humanGate, setHumanGate]   = useState<HumanGate>({ waiting: false, turnId: null })
  const [error, setError]           = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const token = getToken()
    if (!token) throw new Error("Not authenticated")

    setError(null)
    setIsLoading(true)

    // 1. Optimistic user message
    const userId: Message = { id: `u-${Date.now()}`, role: "user", content }
    const aiId = `ai-${Date.now()}`
    const aiMsg: Message = { id: aiId, role: "assistant", content: "", isStreaming: true }
    setMessages(prev => [...prev, userId, aiMsg])

    // 2. Invoke agent
    const invokeRes = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ conversation_id: conversationId, message: content }),
    })
    if (!invokeRes.ok) {
      setError("Failed to start agent")
      setIsLoading(false)
      return
    }
    const { turn_id } = await invokeRes.json()

    // 3. Open SSE stream
    esRef.current?.close()
    const es = new EventSource(`/api/sse/${turn_id}?token=${token}`)
    esRef.current = es

    es.addEventListener("token_stream", (e) => {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: m.content + e.data } : m
      ))
    })

    es.addEventListener("human_gate", () => {
      setHumanGate({ waiting: true, turnId: turn_id })
      setIsLoading(false)
    })

    es.addEventListener("agent_complete", () => {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, isStreaming: false } : m
      ))
      setIsLoading(false)
      es.close()
    })

    es.addEventListener("error", (e) => {
      try { setError(JSON.parse(e.data).message) } catch { setError("Stream error") }
      setIsLoading(false)
      es.close()
    })

  }, [conversationId])

  const handleApprove = useCallback(async () => {
    if (!humanGate.turnId) return
    await fetch(`/api/agent/${humanGate.turnId}/approve`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${getToken()}` },
    })
    setHumanGate({ waiting: false, turnId: null })
    setIsLoading(true)
  }, [humanGate.turnId])

  const handleReject = useCallback(async () => {
    if (!humanGate.turnId) return
    await fetch(`/api/agent/${humanGate.turnId}/reject`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${getToken()}` },
    })
    setHumanGate({ waiting: false, turnId: null })
  }, [humanGate.turnId])

  const reset = useCallback(() => {
    esRef.current?.close()
    setMessages([])
    setHumanGate({ waiting: false, turnId: null })
    setError(null)
  }, [])

  return { messages, isLoading, humanGate, error, sendMessage, handleApprove, handleReject, reset }
}
```

---

## Step 3.2 — ChatWindow Component

```tsx
// components/ChatWindow.tsx
"use client"
import { useState } from "react"
import { useChat } from "@/hooks/useChat"
import MessageBubble from "./MessageBubble"
import HumanGateModal from "./HumanGateModal"

interface Props {
  conversationId: string | null
}

export default function ChatWindow({ conversationId }: Props) {
  const [input, setInput] = useState("")
  const { messages, isLoading, humanGate, error, sendMessage, handleApprove, handleReject } =
    useChat(conversationId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput("")
    await sendMessage(msg)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {isLoading && !messages.some(m => m.isStreaming) && (
          <div className="flex gap-1 px-4">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        {error && <p className="text-red-500 text-sm px-4">{error}</p>}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="border-t p-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2
                     focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:opacity-50 transition"
        >
          Send
        </button>
      </form>

      {/* Human Gate Modal */}
      {humanGate.waiting && (
        <HumanGateModal onApprove={handleApprove} onReject={handleReject} />
      )}
    </div>
  )
}
```

---

## Step 3.3 — MessageBubble Component

```tsx
// components/MessageBubble.tsx
import type { Message } from "@/hooks/useChat"

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap
        ${isUser
          ? "bg-blue-600 text-white rounded-br-sm"
          : "bg-gray-100 text-gray-900 rounded-bl-sm"
        }`}
      >
        {message.content}
        {message.isStreaming && (
          <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />
        )}
      </div>
    </div>
  )
}
```

---

## Step 3.4 — Human Gate Modal

```tsx
// components/HumanGateModal.tsx
export default function HumanGateModal({
  onApprove, onReject
}: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Agent Approval Required</h2>
        <p className="text-gray-600 text-sm mb-6">
          The AI wants to take an action that requires your approval. Do you want to proceed?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700
                       hover:bg-gray-50 transition"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 transition"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Verification

```
1. Login → /chat
2. Type "Hello" → message appears instantly
3. AI response streams token by token in real-time
4. Blinking cursor shows while streaming
5. Send new message to same conversation → AI remembers context
```

> ➡️ Next: [04-history.md](./04-history.md)
