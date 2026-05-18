import { useEffect, useRef } from "react"

export default function HumanGateModal({
  onApprove,
  onReject,
}: {
  onApprove: () => void
  onReject: () => void
}) {
  const firstBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Focus the first button when modal opens
    firstBtnRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onReject()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onReject])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onReject()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "var(--color-modal-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="human-gate-title"
      onClick={handleOverlayClick}
    >
      <div
        className="p-6 max-w-sm w-full"
        style={{
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          backgroundColor: "var(--color-surface-base)",
        }}
      >
        <h2
          id="human-gate-title"
          className="text-lg font-semibold mb-2"
          style={{
            color: "var(--color-text-primary)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          Agent Approval Required
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--color-text-muted)" }}
        >
          The AI wants to take an action that requires your approval. Do you want to proceed?
        </p>
        <div className="flex gap-3">
          <button
            ref={firstBtnRef}
            onClick={onReject}
            className="flex-1 py-2 rounded-[var(--radius-md)] transition"
            aria-label="Reject agent action"
            style={{
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "var(--color-border-muted)",
              color: "var(--color-text-primary)",
              backgroundColor: "var(--color-surface-muted)",
              transitionDuration: "var(--motion-duration-instant)",
            }}
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-2 rounded-[var(--radius-md)] transition"
            aria-label="Approve agent action"
            style={{
              backgroundColor: "var(--color-interactive-primary)",
              color: "var(--color-white)",
              transitionDuration: "var(--motion-duration-instant)",
            }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}