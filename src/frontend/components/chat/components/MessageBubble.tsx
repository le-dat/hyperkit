import { ChatMessage, MessageRole } from "@/types";
import { memo, useState, useEffect, useRef } from "react";
import { MessageHeader } from "./MessageHeader";
import { ModelReasoningProcess } from "./ModelReasoningProcess";
import { AgentThinkingProcess } from "./AgentThinkingProcess";
import { MarkdownContent } from "./MarkdownContent";
import { StreamingIndicator } from "./StreamingIndicator";
import { RetryButton } from "./RetryButton";
import { getBubbleClasses } from "./bubbleStyles";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
  isLastMessage?: boolean;
}

export const MessageBubble = memo(
  function MessageBubble({ message, onRetry, isLastMessage }: MessageBubbleProps) {
    const isUser = message.role === MessageRole.USER;
    const containerClasses = `flex gap-3 md:gap-4 ${isUser ? "justify-end" : ""}`;
    const [showIndicator, setShowIndicator] = useState(message.isStreaming);
    const prevStreamingRef = useRef(message.isStreaming);

    useEffect(() => {
      const wasStreaming = prevStreamingRef.current;
      const isStreaming = message.isStreaming ?? false;

      if (isStreaming !== wasStreaming) {
        if (isStreaming) {
          requestAnimationFrame(() => {
            setShowIndicator(true);
          });
        } else {
          const timer = setTimeout(() => {
            setShowIndicator(false);
          }, 300);
          prevStreamingRef.current = isStreaming;
          return () => clearTimeout(timer);
        }
      }

      prevStreamingRef.current = isStreaming;
    }, [message.isStreaming]);

    return (
      <div className={containerClasses}>
        <div className={getBubbleClasses(isUser)}>
          {!isUser && <MessageHeader timestamp={message.created_at} />}
          {!isUser && <ModelReasoningProcess thoughts={message.thoughts} isThinking={message.isThinking} />}
          {!isUser && <AgentThinkingProcess steps={message.thinkingSteps} />}
          <MarkdownContent content={message.text || ""} isUser={isUser} />
          {showIndicator && <StreamingIndicator isVisible={message.isStreaming ?? false} />}
          {/* Show Regenerate on last AI message (when done), or Retry on error */}
          {!isUser && (
            <RetryButton
              messageId={message.id}
              onRetry={onRetry}
              isLastMessage={isLastMessage}
              isStreaming={message.isStreaming}
              hasError={message.error}
            />
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prev = prevProps.message;
    const next = nextProps.message;

    return (
      prev.id === next.id &&
      prev.text === next.text &&
      prev.isStreaming === next.isStreaming &&
      prev.role === next.role &&
      prev.error === next.error &&
      prev.thoughts === next.thoughts &&
      prev.isThinking === next.isThinking &&
      JSON.stringify(prev.thinkingSteps) === JSON.stringify(next.thinkingSteps) &&
      prevProps.onRetry === nextProps.onRetry &&
      prevProps.isLastMessage === nextProps.isLastMessage
    );
  },
);
