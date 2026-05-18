# Step 01 — Next.js Setup + Route Handler Proxies

## Goal

Next.js App Router boilerplate with:
- Route Handlers as proxies (FastAPI URL is completely hidden from the browser)
- Environment variables (server-side vs client-side)
- CORS without complex configuration because FE proxies itself

> **Prerequisite**: Infrastructure, FastAPI Core, and AI Agent steps 00–08 completed and running.

---

## Design Tokens

Apply these consistently across all frontend components. **Use semantic tokens — never raw hex values.**

### Typography

```
font.family.primary  = pplxSans
font.family.stack    = pplxSans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif
font.size.base       = 16px
font.weight.base     = 400
font.lineHeight.base = 24px
font.size.xs         = 14px
font.size.sm         = 16px
```

### Color Palette

```
color.text.primary   = #27251e
color.text.secondary = #27251e   (WCAG AA on surface.muted)
color.text.muted     = #6b6b6b
color.surface.base   = #ffffff
color.surface.muted  = #fdfbfa
color.surface.raised = rgb(0.152941 0.145098 0.117647)
color.border.default = #271a00
color.border.muted   = #e5e0d8
color.focus.ring     = #000000
color.interactive.primary   = #2563eb   (blue-600)
color.interactive.primaryHover = #1d4ed8 (blue-700)
color.interactive.destructive  = #dc2626 (red-600)
```

### Spacing Scale

```
space.1 = 8px
space.2 = 12px
space.3 = 16px
space.4 = 20px
space.5 = 24px
space.6 = 32px
```

### Radius / Shadow / Motion

```
radius.xs  = 4px
radius.sm  = 6px
radius.md  = 8px
radius.lg  = 12px
radius.xl  = 9999px   (pill)

shadow.sm  = 0 1px 2px 0 rgba(0,0,0,0.05)
shadow.md  = 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)
shadow.lg  = 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)

motion.duration.instant = 150ms
motion.duration.fast    = 300ms
motion.easing.default   = ease-out
```

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

## Accessibility Requirements (WCAG 2.2 AA)

All components must meet these requirements:

- **Focus visible**: Every interactive element must show a visible focus ring using `color.focus.ring (#000000)` at `radius.sm (6px)` offset.
- **Contrast**: Text on backgrounds must maintain minimum 4.5:1 contrast ratio. Muted surfaces may use `color.text.secondary (#27251e)` on `color.surface.muted (#fdfbfa)`.
- **Keyboard navigation**: All interactive elements must be reachable and operable via keyboard (Tab, Enter, Space, Escape).
- **Motion**: Respect `motion.duration.instant (150ms)` and `motion.duration.fast (300ms)`. Provide `prefers-reduced-motion` fallback.
- **Touch targets**: Minimum 44×44px touch area for mobile.

---

## Anti-Patterns

- **Do not** use raw hex values outside of token definition blocks — reference tokens by name in implementation.
- **Do not** use `gray-500`, `gray-600` etc. in class strings — use defined semantic tokens.
- **Do not** introduce one-off spacing values outside the defined spacing scale.
- **Do not** allow hidden focus indicators — `focus:outline-none` must always be paired with `focus:ring-*`.
- **Do not** use `motion.duration` values outside the defined scale (150ms / 300ms).

---

## QA Checklist

- [ ] Typography matches token spec (font size, line height, weight)
- [ ] Color tokens used — no raw hex outside token definition blocks
- [ ] Focus rings visible on all interactive elements
- [ ] WCAG 2.2 AA contrast on all text/background combinations
- [ ] Keyboard navigation works for all interactive elements
- [ ] `prefers-reduced-motion` respected for animations
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] All buttons/inputs have default, hover, focus-visible, active, disabled, loading states
- [ ] Spacing uses `space.*` scale only
- [ ] Border radius uses `radius.*` scale only

> ➡️ Next: [02-auth.md](./02-auth.md)
