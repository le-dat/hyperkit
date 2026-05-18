import { ChatLoadingState } from "./ChatLoadingState";
import { ChatMessages } from "./ChatMessages";
import { EmptyChatState } from "./EmptyChatState";
import { ChatMessage } from "@/types";

interface ChatContentProps {
  isTransitioning: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  onSuggestionClick: (value: string) => void;
  onRetry?: (messageId: string) => void;
}

export function ChatContent({
  isTransitioning,
  messages,
  isLoading,
  onSuggestionClick,
  onRetry,
}: ChatContentProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden pt-6 md:pt-0">
      {isTransitioning ? (
        <ChatLoadingState />
      ) : (
        <div className="h-full animate-fade-in">
          {messages.length === 0 ? (
            <EmptyChatState onSuggestionClick={onSuggestionClick} />
          ) : (
            <ChatMessages messages={messages} isLoading={isLoading} onRetry={onRetry} />
          )}
        </div>
      )}
    </div>
  );
}
