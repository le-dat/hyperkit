# Step 02 — Authentication: Clerk Integration

## Goal

Integrate **Clerk** into the Next.js frontend to handle:
- User Sign-up / Sign-in / Profile management.
- Multi-factor authentication (optional).
- Passing JWTs to the backend via Route Handler proxies.

> **Prerequisite**: Clerk account created and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` obtained.

---

## Step 2.1 — Install Clerk

```bash
npm install @clerk/nextjs
```

---

## Step 2.2 — Configure Clerk Middleware

Protect all routes except the landing page and Clerk's own sign-in/sign-up pages.

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(['/chat(.*)', '/api(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

---

## Step 2.3 — Wrap Layout with ClerkProvider

```tsx
// app/layout.tsx
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="flex justify-between p-4 border-b">
            <h1 className="font-bold">AI Chatbot</h1>
            <SignedOut>
              <SignInButton mode="modal" className="btn-primary" />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

---

## Step 2.4 — Get Token in Client Components

When making calls to your Route Handlers, Clerk handles the session automatically if you use their hooks.

```tsx
// lib/api.ts
import { useAuth } from "@clerk/nextjs";

export const useChatApi = () => {
  const { getToken } = useAuth();

  const sendMessage = async (message: string) => {
    const token = await getToken();
    
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });
    
    return res.json();
  };

  return { sendMessage };
};
```

---

## Step 2.5 — Backend JWT Verification (FastAPI)

Ensure your FastAPI backend is configured as described in [Backend Step 02 — Clerk Auth](../01-ai-server/02-auth.md).

The flow:
1. **Browser**: Calls `getToken()` from Clerk.
2. **Browser**: Calls `POST /api/chat` with `Authorization: Bearer <token>`.
3. **Next.js**: Route handler receives request, optionally checks server-side auth via `auth()`, and forwards the token to FastAPI.
4. **FastAPI**: Verifies JWT using Clerk's JWKS.

---

## Verification Checklist

- [ ] Sign-up / Sign-in works.
- [ ] Unauthorized access to `/chat` redirects to Clerk login.
- [ ] User avatar shows up in header after login.
- [ ] `Authorization` header contains a valid JWT when calling `/api/chat`.

> ➡️ Next: [03-chat-interface.md](./03-chat-interface.md)