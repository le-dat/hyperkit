"use client"
import { useState, useCallback, useRef } from "react"
import { useAuth } from "@clerk/nextjs"

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

export function useChat(conversationId: string | null, initialMessages: Message[] = []) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [humanGate, setHumanGate] = useState<HumanGate>({ waiting: false, turnId: null })
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const token = await getToken()
    if (!token) throw new Error("Not authenticated")

    setError(null)
    setIsLoading(true)

    // 1. Optimistic user message
    const userId: Message = { id: `u-${Date.now()}`, role: "user", content }
    const aiId = `ai-${Date.now()}`
    const aiMsg: Message = { id: aiId, role: "assistant", content: "", isStreaming: true }
    setMessages((prev) => [...prev, userId, aiMsg])

    // 2. Invoke agent
    const invokeRes = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
    const es = new EventSource(`/api/sse/${turn_id}`)
    esRef.current = es

    es.addEventListener("token_stream", (e: Event) => {
      const me = e as MessageEvent
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: m.content + me.data } : m))
      )
    })

    es.addEventListener("human_gate", () => {
      setHumanGate({ waiting: true, turnId: turn_id })
      setIsLoading(false)
    })

    es.addEventListener("agent_complete", () => {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, isStreaming: false } : m))
      )
      setIsLoading(false)
      es.close()
    })

    es.addEventListener("error", (e: Event) => {
      const me = e as MessageEvent
      try {
        setError(JSON.parse(me.data).message)
      } catch {
        setError("Stream error")
      }
      setIsLoading(false)
      es.close()
    })
  }, [conversationId, getToken])

  const handleApprove = useCallback(async () => {
    if (!humanGate.turnId) return
    const token = await getToken()
    await fetch(`/api/agent/${humanGate.turnId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    setHumanGate({ waiting: false, turnId: null })
    setIsLoading(true)
  }, [humanGate.turnId, getToken])

  const handleReject = useCallback(async () => {
    if (!humanGate.turnId) return
    const token = await getToken()
    await fetch(`/api/agent/${humanGate.turnId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    setHumanGate({ waiting: false, turnId: null })
  }, [humanGate.turnId, getToken])

  const reset = useCallback(() => {
    esRef.current?.close()
    setMessages([])
    setHumanGate({ waiting: false, turnId: null })
    setError(null)
  }, [])

  return { messages, isLoading, humanGate, error, sendMessage, handleApprove, handleReject, reset }
}