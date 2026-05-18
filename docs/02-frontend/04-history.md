# Step 04 — History Sidebar + Chat Page Assembly

## Goal

- `useHistory` hook: load conversation list from FastAPI
- `HistorySidebar` component: display conversations, click to reload messages
- `/chat/page.tsx`: assemble final chat page (sidebar + chat window)
- New conversation button

---

## Design Tokens (applied below)

All history components inherit tokens from [01-setup.md](./01-setup.md). Component-specific additions:

### Sidebar

```
sidebar.bg           = #111827  (gray-900)
sidebar.text.primary = #f9fafb  (gray-50)
sidebar.text.muted   = #9ca3af  (gray-400)
sidebar.border       = #374151  (gray-700)
sidebar.hover.bg     = #1f2937  (gray-800)
sidebar.active.bg    = #1f2937  (gray-800)
```

### New Conversation Button

```
button.newConv.bg         = #2563eb (interactive.primary)
button.newConv.bg.hover   = #1d4ed8 (interactive.primaryHover)
button.newConv.text       = #ffffff
button.newConv.radius     = radius.md (8px)
button.newConv.fontSize   = font.size.sm (14px font, or 14px per text-sm)
button.newConv.fontWeight = 500
```

### Chat Page Header

```
header.border    = color.border.muted (#e5e0d8)
header.title     = font.weight.600 (semibold), color.text.primary (#27251e)
header.bg        = color.surface.base (#ffffff)
```

---

## Step 4.1 — useHistory Hook

```ts
// hooks/useHistory.ts
"use client"
import { useState, useEffect, useCallback } from "react"
import { getToken } from "@/lib/auth"

export interface Conversation {
  conversation_id: string
  title: string
  updated_at: string
}

export interface HistoryMessage {
  role: "user" | "assistant"
  content: string
  created_at: string
}

export function useHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const res = await fetch("/api/history", {
      headers: { "Authorization": `Bearer ${token}` },
    })
    if (res.ok) setConversations(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function loadMessages(convId: string): Promise<HistoryMessage[]> {
    const token = getToken()
    const res = await fetch(`/api/history/${convId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    return res.ok ? res.json() : []
  }

  return { conversations, loading, loadMessages, refresh }
}
```

---

## Step 4.2 — HistorySidebar Component

```tsx
// components/HistorySidebar.tsx
"use client"
import { useHistory } from "@/hooks/useHistory"
import { signOut, getUser } from "@/lib/auth"
import { formatDistanceToNow } from "date-fns"   # npm install date-fns

interface Props {
  activeId: string | null
  onSelect: (convId: string) => void
  onNew: () => void
}

export default function HistorySidebar({ activeId, onSelect, onNew }: Props) {
  const { conversations, loading } = useHistory()
  const user = getUser()

  return (
    <aside className="w-64 bg-[#111827] text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#374151]">
        <button
          onClick={onNew}
          className="w-full py-2 px-3 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-[8px]
                     text-sm font-medium transition duration-[150ms] flex items-center gap-2"
        >
          <span>+</span> New conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <p className="text-[#9ca3af] text-sm px-4 py-2">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="text-[#9ca3af] text-sm px-4 py-2">No conversations yet</p>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.conversation_id}
              onClick={() => onSelect(conv.conversation_id)}
              className={`w-full text-left px-4 py-3 hover:bg-[#1f2937] transition duration-[150ms]
                ${activeId === conv.conversation_id ? "bg-[#1f2937]" : ""}
              `}
            >
              <p className="text-sm font-medium text-[#f9fafb] truncate">{conv.title}</p>
              <p className="text-xs text-[#9ca3af] mt-0.5">
                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer: user info + sign out */}
      <div className="p-4 border-t border-[#374151]">
        <div className="text-xs text-[#9ca3af] mb-2 truncate">{user?.email}</div>
        <button
          onClick={signOut}
          className="w-full text-left text-sm text-[#9ca3af] hover:text-white transition"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
```

---

## Step 4.3 — Chat Page Assembly

```tsx
// app/chat/page.tsx
"use client"
import { useState, useCallback } from "react"
import HistorySidebar from "@/components/HistorySidebar"
import ChatWindow from "@/components/ChatWindow"
import { useHistory } from "@/hooks/useHistory"
import { Message } from "@/hooks/useChat"

export default function ChatPage() {
  const [convId, setConvId]             = useState<string | null>(null)
  const [preloadedMsgs, setPreloadedMsgs] = useState<Message[]>([])
  const { loadMessages, refresh }       = useHistory()

  // Click existing conversation → load history messages
  const handleSelect = useCallback(async (selectedConvId: string) => {
    setConvId(selectedConvId)
    const msgs = await loadMessages(selectedConvId)
    setPreloadedMsgs(msgs.map((m, i) => ({
      id: `hist-${i}`,
      role: m.role as "user" | "assistant",
      content: m.content,
    })))
  }, [loadMessages])

  // New conversation
  const handleNew = useCallback(() => {
    setConvId(null)
    setPreloadedMsgs([])
  }, [])

  return (
    <div className="flex h-screen bg-white">
      <HistorySidebar
        activeId={convId}
        onSelect={handleSelect}
        onNew={handleNew}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-[#e5e0d8] px-6 py-3 flex items-center">
          <h1 className="font-semibold text-[#27251e]">
            {convId ? "Conversation" : "New conversation"}
          </h1>
        </header>

        {/* Chat window — key forces remount on new conversation */}
        <ChatWindow
          key={convId ?? "new"}
          conversationId={convId}
          initialMessages={preloadedMsgs}
          onFirstMessage={() => { setConvId(prev => prev); refresh() }}
        />
      </main>
    </div>
  )
}
```

---

## Step 4.4 — Update ChatWindow to accept initialMessages

```tsx
// components/ChatWindow.tsx — add props
interface Props {
  conversationId: string | null
  initialMessages?: Message[]        // ← add this
  onFirstMessage?: () => void        // ← callback to refresh sidebar
}

export default function ChatWindow({ conversationId, initialMessages = [], onFirstMessage }: Props) {
  const { messages, ... } = useChat(conversationId, initialMessages)
  // ...
}
```

```ts
// hooks/useChat.ts — accept initial messages
export function useChat(conversationId: string | null, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  // ...
}
```

---

## Verification Checklist

### Functional
- [ ] Sidebar shows list of past conversations
- [ ] Click conversation → messages reload correctly (in order)
- [ ] "New conversation" → clears chat, starts fresh
- [ ] After first message in new chat → sidebar refreshes with new entry
- [ ] Conversation title shows first 80 chars of first message
- [ ] Sign out → redirected to `/login`

### Design System
- [ ] Sidebar bg: #111827, text: #f9fafb/#9ca3af
- [ ] New conversation button: bg #2563eb → hover #1d4ed8, radius 8px
- [ ] Sidebar hover: bg #1f2937 transition 150ms
- [ ] Header border: #e5e0d8, title: #27251e font-semibold
- [ ] Active conversation highlighted with bg #1f2937
- [ ] Focus visible on all sidebar buttons

> ✅ **Frontend complete!** → Move to [devops/01-docker.md](../03-devops/01-docker.md)
