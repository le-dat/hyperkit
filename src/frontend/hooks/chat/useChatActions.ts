/* eslint-disable @typescript-eslint/no-explicit-any */
import { PATH } from "@/lib/constants";
import { chatApiService } from "@/service/chatApiService";
import { ChatMessage, MessageRole } from "@/types";
import { StreamEventType } from "@/types/api/chat";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useRef } from "react";
import { getErrorMessage } from "@/lib/api/apiUtils";

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
    (event: MessageEvent, aiMsgId: string, conversationId: string) => {
      try {
        let eventType = event.type;
        let eventData: any = null;

        // Try to parse event.data
        let parsedData: any = null;
        try {
          parsedData = JSON.parse(event.data);
        } catch {
          parsedData = event.data;
        }

        // If it's a standard "message" event, extract fields from the wrapper
        if (eventType === "message" && parsedData && typeof parsedData === "object") {
          eventType = parsedData.event || parsedData.type || "message";
          eventData = parsedData.data !== undefined ? parsedData.data : parsedData;
        } else {
          // For custom events (e.g. token_stream), parsedData itself is the payload
          eventData = parsedData;
        }

        if (!eventType) return;

        switch (eventType) {
          case "thought_stream": {
            const delta = typeof eventData === "string" ? eventData : (eventData?.delta || "");
            if (delta) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? {
                        ...msg,
                        thoughts: (msg.thoughts || "") + delta,
                        isThinking: true,
                      }
                    : msg
                )
              );
            }
            break;
          }

          case "token_stream":
          case "content_delta":
          case StreamEventType.ContentDelta: {
            const delta = typeof eventData === "string" ? eventData : (eventData?.delta || "");
            if (delta) {
              const currentBuffer = deltaBufferRef.current.get(aiMsgId) || "";
              deltaBufferRef.current.set(aiMsgId, currentBuffer + delta);
              scheduleUpdate(aiMsgId);

              // Seamlessly turn off thinking mode when we start receiving the actual text tokens
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId && msg.isThinking
                    ? { ...msg, isThinking: false }
                    : msg
                )
              );
            }
            break;
          }

          case "content":
          case StreamEventType.Content: {
            const text = typeof eventData === "string" ? eventData : (eventData?.text || "");
            if (text) {
              flushDeltaBuffer(aiMsgId);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, text: (msg.text || "") + text, isThinking: false }
                    : msg
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

          case "agent_complete":
          case "done":
          case StreamEventType.Done: {
            const finalBuffer = deltaBufferRef.current.get(aiMsgId) || "";
            cleanupMessageResources(aiMsgId);

            startTransition(() => {
              setMessages((prev) => {
                const currentMessage = prev.find((msg) => msg.id === aiMsgId);
                const newText = (currentMessage?.text || "") + finalBuffer;
                const newId = eventData?.assistantMessageId || aiMsgId;
                return prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, text: newText, isStreaming: false, id: newId, isThinking: false }
                    : msg
                );
              });
            });

            // Cleanly close and refresh on completion
            closeEventSource();
            setIsLoading(false);
            refetchConversations();
            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
            break;
          }

          case "human_gate_awaiting": {
            const finalBuffer = deltaBufferRef.current.get(aiMsgId) || "";
            cleanupMessageResources(aiMsgId);

            startTransition(() => {
              setMessages((prev) => {
                const currentMessage = prev.find((msg) => msg.id === aiMsgId);
                const newText = (currentMessage?.text || "") + finalBuffer;
                return prev.map((msg) =>
                  msg.id === aiMsgId
                    ? { ...msg, text: newText, isStreaming: false, awaitingApproval: true }
                    : msg
                );
              });
            });

            closeEventSource();
            setIsLoading(false);
            refetchConversations();
            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
            break;
          }

          case "error":
          case StreamEventType.Error: {
            const errorBuffer = deltaBufferRef.current.get(aiMsgId) || "";
            cleanupMessageResources(aiMsgId);

            startTransition(() => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== aiMsgId) return msg;
                  const errorMsg = typeof eventData === "string" ? eventData : (eventData?.message || "Unknown error");
                  const finalText = msg.text
                    ? msg.text + errorBuffer
                    : errorBuffer || `I encountered an error: ${errorMsg}`;
                  return { ...msg, text: finalText, isStreaming: false, error: true };
                })
              );
            });

            closeEventSource();
            setIsLoading(false);
            break;
          }

          case "timeout":
          case "rejected":
          case "cancelled": {
            cleanupMessageResources(aiMsgId);
            closeEventSource();
            setIsLoading(false);
            break;
          }

          case "agent_thinking": {
            const stepData = eventData;
            if (stepData && typeof stepData === "object") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== aiMsgId) return msg;

                  const currentSteps = msg.thinkingSteps || [];
                  const updatedSteps = [...currentSteps];

                  if (stepData.step === "end") {
                    const lastStartIndex = updatedSteps.map((s) => s.tool).lastIndexOf(stepData.tool);
                    if (lastStartIndex !== -1) {
                      updatedSteps[lastStartIndex] = {
                        ...updatedSteps[lastStartIndex],
                        status: stepData.status,
                        output: stepData.output,
                        isCompleted: true,
                      };
                    }
                  } else {
                    updatedSteps.push({
                      id: `${Date.now()}-${stepData.tool}`,
                      tool: stepData.tool,
                      input: stepData.input,
                      status: stepData.status,
                      isCompleted: false,
                      timestamp: new Date().toISOString(),
                    });
                  }

                  return { ...msg, thinkingSteps: updatedSteps };
                })
              );
            }
            break;
          }

          default:
            break;
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    },
    [flushDeltaBuffer, scheduleUpdate, setMessages, setIsLoading, refetchConversations, queryClient]
  );

  const invokeAgentWithSSE = async (
    conversationId: string,
    message: string,
    aiMsgId: string,
    turnId: string
  ) => {
    const sseUrl = `/api/chat/v1/sse/${turnId}`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    const eventTypes = [
      "message",
      "token_stream",
      "thought_stream",
      "agent_complete",
      "human_gate_awaiting",
      "error",
      "cancelled",
      "node_start",
      "agent_thinking"
    ];

    eventTypes.forEach((type) => {
      eventSource.addEventListener(type, (event) => {
        handleStreamEvent(event, aiMsgId, conversationId);
      });
    });

    eventSource.addEventListener("error", (error) => {
      // Standard EventSource error handler — only fallback if not already closed cleanly
      if (!eventSourceRef.current) return;
      console.error("SSE connection error:", error);
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
      const result = await chatApiService.invokeAgent({
        conversationId: conversationId || undefined,
        message: userInput,
      });

      const { turn_id, conversation_id } = result.data;
      conversationId = conversation_id;

      if (!currentConversationId) {
        justCreatedConversationRef.current = true;
        setCurrentConversationId(conversationId);
        router.push(`${PATH.agent}?id=${conversationId}`);
      }

      refetchConversations();

      await invokeAgentWithSSE(conversationId!, userInput, aiMsgId, turn_id);
    } catch (error) {
      console.error("Failed to send message:", error);
      cleanupMessageResources(aiMsgId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== aiMsgId) return msg;
          return {
            ...msg,
            text: getErrorMessage(error) || "I encountered an error connecting to the AI service.",
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
    if (!errorMessage) return;

    // Find the user message that preceded this AI message
    let userMessage: ChatMessage | undefined;
    for (let i = errorMessageIndex - 1; i >= 0; i--) {
      if (messages[i].role === MessageRole.USER) {
        userMessage = messages[i];
        break;
      }
    }

    // For retry (error state) or regenerate (last message), need user message and conversation
    if (!userMessage || !currentConversationId) return;

    // For retry (error state): remove only the error AI message
    // For regenerate: remove the last AI message
    const isRegenerate = !errorMessage.error;

    if (isRegenerate) {
      // Regenerate: remove just the AI message at errorMessageIndex (user message stays)
      setMessages((prev) => prev.filter((_, idx) => idx !== errorMessageIndex));
    } else {
      // Retry on error: remove the error AI message (user message stays)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    }

    const aiMsgId = Date.now() + "-ai";

    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: MessageRole.ASSISTANT,
      text: "",
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setIsLoading(true);
    setMessages((prev) => [...prev, aiMsg]);
    deltaBufferRef.current.set(aiMsgId, "");

    try {
      const result = await chatApiService.invokeAgent({
        conversationId: currentConversationId,
        message: userMessage.text,
      });

      const { turn_id } = result.data;
      await invokeAgentWithSSE(currentConversationId!, userMessage.text, aiMsgId, turn_id);
    } catch (error) {
      console.error("Retry failed:", error);
      cleanupMessageResources(aiMsgId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== aiMsgId) return msg;
          return {
            ...msg,
            text: getErrorMessage(error) || "I encountered an error. Please try again.",
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