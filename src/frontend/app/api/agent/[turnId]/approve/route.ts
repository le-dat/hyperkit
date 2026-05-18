import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ turnId: string }> }
) {
  const { turnId } = await params
  const { getToken } = await auth()
  const token = await getToken()

  const res = await fetch(`${process.env.BACKEND_URL}/agent/${turnId}/approve`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  })

  return NextResponse.json(await res.json(), { status: res.status })
}