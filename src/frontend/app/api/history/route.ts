import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(req: NextRequest) {
  const { getToken } = await auth()
  const token = await getToken()

  const res = await fetch(`${process.env.BACKEND_URL}/history`, {
    headers: { "Authorization": `Bearer ${token}` },
  })

  return NextResponse.json(await res.json(), { status: res.status })
}