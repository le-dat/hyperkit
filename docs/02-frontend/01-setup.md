# Step 01 — Next.js Setup + Route Handler Proxies

## Goal

Next.js App Router boilerplate with:
- Route Handlers as proxies (FastAPI URL is completely hidden from the browser)
- Environment variables (server-side vs client-side)
- CORS without complex configuration because FE proxies itself

> **Prerequisite**: Infrastructure, FastAPI Core, and AI Agent steps 00–08 completed and running.

---

## File Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      ← redirect → /chat
│   ├── login/page.tsx
│   ├── chat/page.tsx
│   └── api/
│       ├── chat/route.ts             ← POST proxy → /agent/invoke
│       ├── sse/[turnId]/route.ts     ← SSE proxy → /sse/{turn_id}
│       ├── agent/[turnId]/
│       │   ├── approve/route.ts
│       │   └── reject/route.ts
│       └── history/
│           ├── route.ts              ← GET → /history
│           └── [convId]/route.ts     ← GET → /history/{convId}
├── hooks/
│   ├── useChat.ts
│   └── useHistory.ts
├── components/
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   ├── HumanGateModal.tsx
│   └── HistorySidebar.tsx
└── lib/
    └── api.ts
```

---

## Step 1.1 — Create Next.js App

```bash
cd ai-chatbot
npx create-next-app@latest frontend \
  --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd frontend
```

---

## Step 1.2 — Environment Variables

> **Important**: Clerk handles auth on the client-side. The `BACKEND_URL` is used only by Next.js Route Handlers (Server Components) to communicate securely with FastAPI.

```env
# frontend/.env.local (Development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
BACKEND_URL=http://localhost:8000
```

> **Rule**: `BACKEND_URL` must NEVER have the `NEXT_PUBLIC_` prefix.
> All calls to FastAPI go through Route Handlers — the browser never sees the FastAPI URL.

---

## Step 1.3 — Route Handler: POST /api/chat

```ts
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.split(" ")[1] ?? ""
  const body  = await req.json()

  const res = await fetch(`${process.env.BACKEND_URL}/agent/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  return NextResponse.json(await res.json(), { status: res.status })
}
```

---

## Step 1.4 — Route Handler: SSE /api/sse/[turnId]

```ts
// app/api/sse/[turnId]/route.ts
import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { turnId: string } }
) {
  const { getToken } = await auth()
  const token = await getToken()

  const upstream = await fetch(`${process.env.BACKEND_URL}/sse/${params.turnId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  })

  // Pipe SSE stream directly to browser
  return new Response(upstream.body, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  })
}
```

> **Security note**: The Clerk JWT is forwarded to FastAPI in the `Authorization` header.
> FastAPI verifies the JWT using Clerk's public keys.

---

## Step 1.5 — Route Handlers: Approve / Reject / History

```ts
// app/api/agent/[turnId]/approve/route.ts
import { NextRequest, NextResponse } from "next/server"
export async function POST(req: NextRequest, { params }: { params: { turnId: string } }) {
  const token = req.headers.get("authorization")?.split(" ")[1] ?? ""
  const res = await fetch(`${process.env.BACKEND_URL}/agent/${params.turnId}/approve`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  })
  return NextResponse.json(await res.json())
}
```

```ts
// app/api/history/route.ts
import { NextRequest, NextResponse } from "next/server"
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.split(" ")[1] ?? ""
  const res = await fetch(`${process.env.BACKEND_URL}/history`, {
    headers: { "Authorization": `Bearer ${token}` },
  })
  return NextResponse.json(await res.json())
}
```

```ts
// app/api/history/[convId]/route.ts
import { NextRequest, NextResponse } from "next/server"
export async function GET(req: NextRequest, { params }: { params: { convId: string } }) {
  const token = req.headers.get("authorization")?.split(" ")[1] ?? ""
  const res = await fetch(`${process.env.BACKEND_URL}/history/${params.convId}`, {
    headers: { "Authorization": `Bearer ${token}` },
  })
  return NextResponse.json(await res.json())
}
```

---

## Step 1.6 — Start

```bash
npm run dev
# → http://localhost:3000

# Verify proxy works
curl http://localhost:3000/api/history \
  -H "Authorization: Bearer <token>"
# → proxied from FastAPI
```

## Verification Checklist

- [ ] `npm run dev` starts with no TypeScript errors
- [ ] `BACKEND_URL` not visible in browser Network tab (only `/api/*` calls)
- [ ] `GET /api/history` proxies correctly to FastAPI
- [ ] SSE proxy streams events to browser

> ➡️ Next: [02-auth.md](./02-auth.md)
