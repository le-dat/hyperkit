import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ turnId: string }> }
) {
  const { turnId } = await params
  const { getToken } = await auth()
  const token = await getToken()

  const upstream = await fetch(`${process.env.BACKEND_URL}/sse/${turnId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to connect to SSE" }, { status: upstream.status })
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}