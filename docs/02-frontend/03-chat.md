# Step 03 — Chat UI: useChat Hook + SSE Streaming + Human Gate

## Goal

- `useChat` hook: send message → invoke → SSE streaming → render tokens
- Human gate modal: agent pauses, user approves/rejects
- ChatWindow + MessageBubble components

---

## Design Tokens (applied below)

All chat components inherit tokens from [01-setup.md](./01-setup.md). Component-specific additions:

### Message Bubble States

```
message.user.bg           = color.interactive.primary    (#2563eb)
message.user.text         = #ffffff
message.user.radius       = radius.lg (12px), corner-br = radius.xs (4px)
message.assistant.bg      = color.surface.muted          (#fdfbfa)
message.assistant.text    = color.text.primary           (#27251e)
message.assistant.radius  = radius.lg (12px), corner-bl = radius.xs (4px)
message.streaming.cursor  = currentColor, w-1, h-4, animate-pulse
```

### Input Field States

```
input.bg             = color.surface.base  (#ffffff)
input.border         = color.border.default (#271a00)
input.border.muted   = color.border.muted  (#e5e0d8)
input.placeholder    = #9ca3af
input.focus.ring      = color.focus.ring    (#000000)
input.disabled.bg     = color.surface.muted (#fdfbfa)
input.disabled.opacity = 0.5
```

### Loading Indicator

```
loading.dot.size      = 8px (w-2 h-2)
loading.dot.color     = #9ca3af
loading.dot.interval  = 150ms stagger
loading.dot.animation = bounce
```

### Modal Overlay

```
modal.overlay.bg      = rgba(0, 0, 0, 0.5)
modal.surface.bg       = color.surface.base (#ffffff)
modal.surface.radius   = radius.lg (12px)
modal.surface.shadow   = shadow.lg
modal.padding          = space.5 (24px)
```

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
            {/* dots: 8px, #9ca3af, 150ms stagger, bounce */}
            <span className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-[#9ca3af] rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        {error && <p className="text-[#dc2626] text-sm px-4">{error}</p>}
      </div>

      {/* Input */}
      <form onSubmit={submit} className="border-t p-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={isLoading}
          className="flex-1 px-4 py-2 border rounded-[8px] focus:outline-none focus:ring-2
                     focus:ring-[#000000] disabled:opacity-50
                     bg-white border-[#271a00] disabled:bg-[#fdfbfa]"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-[#2563eb] text-white rounded-[8px] hover:bg-[#1d4ed8]
                     disabled:opacity-50 transition duration-[150ms]"
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
      <div
        className={`max-w-[75%] px-4 py-2 text-sm whitespace-pre-wrap
          ${isUser
            // bg: #2563eb, text: #fff, radius: 12px, bottom-right: 4px
            ? "bg-[#2563eb] text-white rounded-[12px] rounded-br-[4px]"
            // bg: #fdfbfa, text: #27251e, radius: 12px, bottom-left: 4px
            : "bg-[#fdfbfa] text-[#27251e] rounded-[12px] rounded-bl-[4px]"
          }`}
      >
        {message.content}
        {message.isStreaming && (
          // streaming cursor: 1px wide, 16px tall, current color, pulse
          <span className="inline-block w-px h-4 bg-current ml-1 animate-pulse" />
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
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50">
      <div className="bg-white rounded-[12px] p-6 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-semibold text-[#27251e] mb-2">Agent Approval Required</h2>
        <p className="text-[#6b6b6b] text-sm mb-6">
          The AI wants to take an action that requires your approval. Do you want to proceed?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-2 border border-[#e5e0d8] rounded-[8px] text-[#27251e]
                       hover:bg-[#fdfbfa] transition duration-[150ms]"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-2 bg-[#2563eb] text-white rounded-[8px]
                       hover:bg-[#1d4ed8] transition duration-[150ms]"
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

## Verification Checklist

- [ ] Input field: default, focus-visible (ring), typing, disabled states
- [ ] Send button: default, hover, disabled, loading states
- [ ] Message bubbles: user (right, blue) vs assistant (left, muted) render correctly
- [ ] Streaming cursor appears and pulses while AI is generating
- [ ] Loading dots render with correct timing (150ms stagger)
- [ ] Human gate modal: overlay, surface, buttons match tokens
- [ ] Keyboard navigation: Tab through input → button → modal buttons
- [ ] `motion.duration.instant (150ms)` used for all interactive transitions
- [ ] `radius.md (8px)` used on all interactive surfaces
- [ ] Error state shows red text (#dc2626) with correct token
- [ ] `prefers-reduced-motion`: bounce animation degrades gracefully

> ➡️ Next: [04-history.md](./04-history.md)
