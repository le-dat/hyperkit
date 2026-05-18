import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function POST(req: NextRequest) {
  const { getToken } = await auth()
  const token = await getToken()
  const body = await req.json()

  const res = await fetch(`${process.env.BACKEND_URL}/agent/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  return NextResponse.json(await res.json(), { status: res.status })
}