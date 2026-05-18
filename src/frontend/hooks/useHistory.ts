"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/nextjs"

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
  const { getToken } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const res = await fetch("/api/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setConversations(await res.json())
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function loadMessages(convId: string): Promise<HistoryMessage[]> {
    const token = await getToken()
    const res = await fetch(`/api/history/${convId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok ? res.json() : []
  }

  return { conversations, loading, loadMessages, refresh }
}