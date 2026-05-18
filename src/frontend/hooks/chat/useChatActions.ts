import { PATH } from "@/lib/constants";
import { chatApiService, InvokeAgentResponse } from "@/service/chatApiService";
import { ChatMessage, MessageRole } from "@/types";
import { StreamEventType } from "@/types/api/chat";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useRef } from "react";

interface UseChatActionsProps {
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsTransitioning: (transitioning: boolean) => void;
  refetchConversations: () => void;
  justCreatedConversationRef: React.MutableRefObject<boolean>;
}

export function useChatActions({
  currentConversationId,
  setCurrentConversationId,
  input,
  setInput,
  isLoading,
  setIsLoading,
  messages,
  setMessages,
  setIsTransitioning,
  refetchConversations,
  justCreatedConversationRef,
}: UseChatActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const rafIdRef = useRef<Map<string, number>>(new Map());

  const cleanupMessageResources = (messageId: string) => {
    const rafId = rafIdRef.current.get(messageId);
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafIdRef.current.delete(messageId);
    }
    deltaBufferRef.current.delete(messageId);
  };

  const flushDeltaBuffer = useCallback(
    (messageId: string) => {
      const bufferedDelta = deltaBufferRef.current.get(messageId);
      if (!bufferedDelta) return;

      deltaBufferRef.current.delete(messageId);
      rafIdRef.current.delete(messageId);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, text: (msg.text || "") + bufferedDelta } : msg
        )
      );
    },
    [setMessages]
  );

  const scheduleUpdate = useCallback(
    (messageId: string) => {
      const existingRafId = rafIdRef.current.get(messageId);
      if (existingRafId !== undefined) {
        cancelAnimationFrame(existingRafId);
      }

      const rafId = requestAnimationFrame(() => {
        flushDeltaBuffer(messageId);
        rafIdRef.current.delete(messageId);
      });

      rafIdRef.current.set(messageId, rafId);
    },
    [flushDeltaBuffer]
  );

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleStreamEvent = useCallback(
    (event: MessageEvent, aiMsgId: string, _conversationId: string) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || {};
        const eventType = payload.event || payload.type;

        switch (eventType) {
          case "content_delta":
          case StreamEventType.ContentDelta: {
            const delta = data.delta || "";
            if (delta) {
              const currentBuffer = deltaBufferRef.current.get(aiMsgId) || "";
              deltaBufferRef.current.set(aiMsgId, currentBuffer + delta);
              scheduleUpdate(aiMsgId);
            }
            break;
          }

          case "content":
          case StreamEventType.Content: {
            const text = data.text || "";
            if (text) {
              flushDeltaBuffer(aiMsgId);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, text: (msg.text || "") + text } : msg
                )
              );
            }
            break;
          }

          case "content_end":
          case StreamEventType.ContentEnd: {
            flushDeltaBuffer(aiMsgId);
            break;
          }

          case "done":
          case StreamEventType.Done: {
            const finalBuffer = deltaBufferRef.current.get(aiMsgId) || "";
            cleanupMessageResources(aiMsgId);

            startTransition(() => {
              setMessages((prev) => {
                const currentMessage = prev.find((msg) => msg.id === aiMsgId);
                const newText = (currentMessage?.text || "") + finalBuffer;
                const newId = data.assistantMessageId || aiMsgId;
                return prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, text: newText, isStreaming: false, id: newId }
                    : msg
                );
              });
            });
            break;
          }

          case "message_complete":
          case StreamEventType.MessageComplete: {
            const completeBuffer = deltaBufferRef.current.get(aiMsgId) || "";
            cleanupMessageResources(aiMsgId);

            startTransition(() => {
              setMessages((prev) => {
                const currentMessage = prev.find((msg) => msg.id === aiMsgId);
                const newText = (currentMessage?.text || "") + completeBuffer;
                const newId = data.assistantMessageId || aiMsgId;
                return prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, text: newText, isStreaming: false, id: newId }
                    : msg
                );
              });
            });
            break;
          }

          case "error":
          case StreamEventType.Error: {
            console.error("Stream error:", data.message);
            const errorBuffer = deltaBufferRef.current.get(aiMsgId) || "";
            cleanupMessageResources(aiMsgId);

            startTransition(() => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== aiMsgId) return msg;
                  const finalText = msg.text
                    ? msg.text + errorBuffer
                    : errorBuffer || "I encountered an error: " + (data.message || "Unknown error");
                  return { ...msg, text: finalText, isStreaming: false, error: true };
                })
              );
            });
            break;
          }

          case "timeout":
          case "rejected":
          case "cancelled":
          case "agent_complete": {
            cleanupMessageResources(aiMsgId);
            setIsLoading(false);
            break;
          }

          default:
            break;
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    },
    [flushDeltaBuffer, scheduleUpdate, setMessages, setIsLoading]
  );

  const invokeAgentWithSSE = async (
    conversationId: string,
    message: string,
    aiMsgId: string,
    turnId: string
  ) => {
    const sseUrl = `/api/sse/v1/${turnId}`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("message", (event) => {
      handleStreamEvent(event, aiMsgId, conversationId);
    });

    eventSource.addEventListener("error", (error) => {
      console.error("SSE error:", error);
      closeEventSource();
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== aiMsgId) return msg;
          return {
            ...msg,
            text: msg.text || "Connection lost. Please try again.",
            isStreaming: false,
            error: true,
          };
        })
      );
      setIsLoading(false);
    });

    eventSource.addEventListener("done", () => {
      closeEventSource();
      setIsLoading(false);
      refetchConversations();
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    const userMsgId = Date.now().toString();
    const aiMsgId = Date.now() + 1 + "-ai";

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: MessageRole.USER,
      text: userInput,
      created_at: new Date().toISOString(),
    };

    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: MessageRole.ASSISTANT,
      text: "",
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, userMsg, aiMsg]);

    deltaBufferRef.current.set(aiMsgId, "");

    let conversationId = currentConversationId;

    try {
      const invokeResponse = await chatApiService.invokeAgent({
        conversationId: conversationId || undefined,
        message: userInput,
      });

      if (!invokeResponse || "success" in invokeResponse && !invokeResponse.success) {
        const errorMsg = "success" in invokeResponse && typeof invokeResponse.error === 'string'
          ? invokeResponse.error
          : "Failed to invoke agent";
        throw new Error(errorMsg);
      }

      const { turn_id, conversation_id } = invokeResponse as InvokeAgentResponse;
      conversationId = conversation_id;

      if (!currentConversationId) {
        justCreatedConversationRef.current = true;
        setCurrentConversationId(conversationId);
        router.push(`${PATH.agent}?id=${conversationId}`);
      }

      refetchConversations();

      await invokeAgentWithSSE(conversationId, userInput, aiMsgId, turn_id);
    } catch (error) {
      console.error("Failed to send message:", error);
      cleanupMessageResources(aiMsgId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== aiMsgId) return msg;
          return {
            ...msg,
            text: "I encountered an error connecting to the AI service.",
            isStreaming: false,
            error: true,
          };
        })
      );
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    closeEventSource();
    if (messages?.length === 0) return;

    startTransition(() => {
      setIsTransitioning(true);
      setCurrentConversationId(null);
      setMessages([]);
      setInput("");
    });

    router.push(PATH.agent);
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId === currentConversationId) return;

    closeEventSource();

    setIsTransitioning(true);
    setCurrentConversationId(chatId);
    router.push(`${PATH.agent}?id=${chatId}`);
  };

  const retryMessage = async (messageId: string) => {
    const errorMessageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (errorMessageIndex === -1) return;

    const errorMessage = messages[errorMessageIndex];
    if (!errorMessage || !errorMessage.error) return;

    let userMessage: ChatMessage | undefined;
    for (let i = errorMessageIndex - 1; i >= 0; i--) {
      if (messages[i].role === MessageRole.USER) {
        userMessage = messages[i];
        break;
      }
    }

    if (!userMessage || !currentConversationId) return;

    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    const userMsgId = Date.now().toString();
    const aiMsgId = Date.now() + 1 + "-ai";

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: MessageRole.USER,
      text: userMessage.text,
      created_at: new Date().toISOString(),
    };

    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: MessageRole.ASSISTANT,
      text: "",
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setIsLoading(true);
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    deltaBufferRef.current.set(aiMsgId, "");

    try {
      const invokeResponse = await chatApiService.invokeAgent({
        conversationId: currentConversationId,
        message: userMessage.text,
      });

      if (!invokeResponse || "success" in invokeResponse && !invokeResponse.success) {
        const errorMsg = "success" in invokeResponse && typeof invokeResponse.error === 'string'
          ? invokeResponse.error
          : "Failed to invoke agent";
        throw new Error(errorMsg);
      }

      const { turn_id } = invokeResponse as InvokeAgentResponse;
      await invokeAgentWithSSE(currentConversationId, userMessage.text, aiMsgId, turn_id);
    } catch (error) {
      console.error("Retry failed:", error);
      cleanupMessageResources(aiMsgId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== aiMsgId) return msg;
          return {
            ...msg,
            text: "I encountered an error. Please try again.",
            isStreaming: false,
            error: true,
          };
        })
      );
      setIsLoading(false);
    }
  };

  return {
    handleSubmit,
    handleNewChat,
    handleSelectChat,
    retryMessage,
  };
}