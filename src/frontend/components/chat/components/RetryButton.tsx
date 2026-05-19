import React from "react";
import { RotateCcw } from "lucide-react";

interface RetryButtonProps {
  messageId: string;
  onRetry?: (messageId: string) => void;
  isLastMessage?: boolean;
  isStreaming?: boolean;
  hasError?: boolean;
}

export function RetryButton({
  messageId,
  onRetry,
  isLastMessage,
  isStreaming,
  hasError,
}: RetryButtonProps) {
  if (!onRetry) return null;

  // Don't show while streaming (like ChatGPT)
  if (isStreaming) return null;

  // Show Regenerate on last assistant message (ChatGPT/Vercel pattern)
  // Show Retry on error state (even if not last message)
  const showRegenerate = isLastMessage && !hasError;
  const showRetry = hasError;

  if (!showRegenerate && !showRetry) return null;

  return (
    <button
      onClick={() => onRetry(messageId)}
      className={`mt-3 flex items-center gap-2 px-3 py-1.5 text-sm ${
        showRegenerate
          ? "text-hyper-100 bg-hyper-700 hover:bg-hyper-600 border border-hyper-600"
          : "text-hyper-300 hover:text-hyper-100 bg-hyper-800 hover:bg-hyper-700 border border-hyper-700 hover:border-hyper-600"
      } rounded-lg transition-colors`}
    >
      <RotateCcw className="w-4 h-4" />
      <span>{showRegenerate ? "Regenerate" : "Retry"}</span>
    </button>
  );
}
