"use client"
import { useAuth } from "@clerk/nextjs"

export function useApi() {
  const { getToken } = useAuth()

  async function request(path: string, options: RequestInit = {}) {
    const token = await getToken()
    return fetch(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })
  }

  return { get: (path: string) => request(path), post: (path: string, body?: unknown) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) }
}