import { useRef, useEffect } from "react";
import { ChatMessage, MessageRole } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { Sparkles } from "lucide-react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRetry?: (messageId: string) => void;
}

export function ChatMessages({ messages, isLoading, onRetry }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const currentLength = messages?.length || 0;
    const prevLength = prevMessagesLengthRef.current;
    const hasNewMessage = currentLength > prevLength;
    const hasStreamingMessage = messages?.some((msg) => msg.isStreaming) || false;

    const shouldScroll = hasNewMessage || hasStreamingMessage;

    if (shouldScroll && messagesEndRef.current) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        rafIdRef.current = null;
      });
    }

    prevMessagesLengthRef.current = currentLength;

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [messages, isLoading]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {messages?.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-6 md:p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-linear-to-tr from-hyper-accent to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-hyper-accent/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Hyperkit Agent</h2>
          <p className="text-hyper-400 max-w-md text-sm mb-8 px-2">
            I&apos;m your AI workflow architect. I can connect tools, build automation pipelines,
            and handle complex logic.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto w-full py-8 md:py-10 px-4 space-y-6 md:space-y-8 pb-6">
          {messages?.map((msg, index) => {
            const isLastAssistantMessage =
              msg.role === MessageRole.ASSISTANT &&
              index === messages.length - 1;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRetry={onRetry}
                isLastMessage={isLastAssistantMessage}
              />
            );
          })}
          {isLoading && messages?.length > 0 && !messages.some((msg) => msg.isStreaming) && (
            <div className="flex items-center gap-1.5 mt-3">
              <div className="w-2 h-2 bg-hyper-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-hyper-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-hyper-500 rounded-full animate-bounce delay-200"></div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      )}
    </div>
  );
}
