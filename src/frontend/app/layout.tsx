import type { Metadata } from "next"
import { ClerkProvider, SignInButton, SignOutButton, UserButton } from "@clerk/nextjs"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI Chatbot",
  description: "Hybrid AI chatbot with LangGraph agent",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-full flex flex-col">
          <header
            className="flex justify-between p-4 border-b"
            style={{
              borderColor: "var(--color-border-muted)",
              backgroundColor: "var(--color-surface-base)",
            }}
          >
            <h1
              className="text-lg"
              style={{
                color: "var(--color-text-primary)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              AI Chatbot
            </h1>
            <SignInButton mode="modal">
              <button
                className="px-4 py-2 text-white rounded-[var(--radius-md)] text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-interactive-primary)",
                  transitionDuration: "var(--motion-duration-instant)",
                }}
              >
                Sign In
              </button>
            </SignInButton>
            <SignOutButton>
              <button
                className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium"
                style={{
                  backgroundColor: "var(--color-surface-muted)",
                  color: "var(--color-text-primary)",
                  transitionDuration: "var(--motion-duration-instant)",
                }}
              >
                Sign Out
              </button>
            </SignOutButton>
            <UserButton />
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}