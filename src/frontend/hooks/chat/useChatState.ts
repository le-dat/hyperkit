import { useEffect, useState, startTransition, useRef } from "react";
import { ChatMessage } from "@/types";
import { transformMessagesToChatMessages } from "@/lib/chat/messageTransformers";
import { GetMessagesSuccess } from "@/types/api/conversations";

interface UseChatStateProps {
  currentConversationId: string | null;
  messagesData?: GetMessagesSuccess;
  justCreatedConversationRef: React.MutableRefObject<boolean>;
}

export function useChatState({
  currentConversationId,
  messagesData,
  justCreatedConversationRef,
}: UseChatStateProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousConversationIdRef = useRef<string | null>(null);

  // Load conversation messages when ID changes or when messagesData updates
  useEffect(() => {
    const conversationIdChanged = previousConversationIdRef.current !== currentConversationId;
    previousConversationIdRef.current = currentConversationId;

    if (currentConversationId && messagesData?.success && messagesData.data) {
      // Skip loading if conversation was just created (prevents duplicate messages)
      if (justCreatedConversationRef.current) {
        justCreatedConversationRef.current = false;
        // Use startTransition to mark as non-urgent update
        startTransition(() => {
          setIsTransitioning(false);
        });
        return;
      }

      const chatMessages = transformMessagesToChatMessages(messagesData.data);
      // Use startTransition to batch state updates and mark as non-urgent
      startTransition(() => {
        setMessages(chatMessages);
        setIsTransitioning(false);
      });
    } else if (!currentConversationId) {
      // When clearing conversation (e.g., New Chat clicked)
      // Only update messages if conversation ID actually changed to avoid unnecessary updates
      if (conversationIdChanged) {
        startTransition(() => {
          setMessages([]);
          setIsTransitioning(false);
        });
      }
    }
  }, [currentConversationId, messagesData, justCreatedConversationRef]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    isTransitioning,
    setIsTransitioning,
  };
}
