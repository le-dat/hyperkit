"use client"
import { UserButton, SignOutButton } from "@clerk/nextjs"
import { useUser } from "@clerk/nextjs"
import { useHistory } from "@/hooks/useHistory"
import { formatDistanceToNow } from "date-fns"

interface Props {
  activeId: string | null
  onSelect: (convId: string) => void
  onNew: () => void
}

export default function HistorySidebar({ activeId, onSelect, onNew }: Props) {
  const { user } = useUser()
  const { conversations, loading } = useHistory()

  return (
    <aside
      className="w-64 text-white flex flex-col h-full"
      style={{ backgroundColor: "var(--color-sidebar-bg)" }}
      aria-label="Conversation history"
    >
      {/* Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "var(--color-sidebar-border)" }}
      >
        <button
          onClick={onNew}
          className="w-full py-2 px-3 rounded-[var(--radius-md)] text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: "var(--color-interactive-primary)",
            color: "var(--color-white)",
            transitionDuration: "var(--motion-duration-instant)",
          }}
        >
          <span>+</span> New conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <p
            className="text-sm px-4 py-3"
            style={{ color: "var(--color-sidebar-text-muted)" }}
          >
            Loading...
          </p>
        ) : conversations.length === 0 ? (
          <p
            className="text-sm px-4 py-3"
            style={{ color: "var(--color-sidebar-text-muted)" }}
          >
            No conversations yet
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.conversation_id}
              onClick={() => onSelect(conv.conversation_id)}
              className="w-full text-left px-4 py-3 transition"
              style={{
                backgroundColor:
                  activeId === conv.conversation_id
                    ? "var(--color-sidebar-active-bg)"
                    : "transparent",
                color: "var(--color-sidebar-text-primary)",
                transitionDuration: "var(--motion-duration-instant)",
                minHeight: "44px",
              }}
            >
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--color-sidebar-text-primary)" }}
              >
                {conv.title}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-sidebar-text-muted)" }}
              >
                {formatDistanceToNow(new Date(conv.updated_at), {
                  addSuffix: true,
                })}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer: user info + sign out */}
      <div
        className="p-4 border-t"
        style={{ borderColor: "var(--color-sidebar-border)" }}
      >
        <div
          className="text-xs mb-2 truncate"
          style={{ color: "var(--color-sidebar-text-muted)" }}
        >
          {user?.emailAddresses?.[0]?.emailAddress ?? "User"}
        </div>
        <SignOutButton>
          <button
            className="w-full text-left text-sm transition"
            style={{
              color: "var(--color-sidebar-text-muted)",
              transitionDuration: "var(--motion-duration-instant)",
            }}
          >
            Sign out
          </button>
        </SignOutButton>
      </div>
    </aside>
  )
}