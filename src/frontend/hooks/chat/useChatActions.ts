import { PATH } from "@/lib/constants";
import { chatApiService } from "@/service/chatApiService";
import { ChatMessage, MessageRole, StreamData } from "@/types";
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

  const deltaBufferRef = useRef<Map<string, string>>(new Map());
  const rafIdRef = useRef<Map<string, number>>(new Map());

  const abortMessageSending = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    rafIdRef.current.forEach((id) => cancelAnimationFrame(id));
    rafIdRef.current.clear();
    deltaBufferRef.current.clear();
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
      // Cancel existing scheduled update for this message
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

  const cleanupMessageResources = (messageId: string) => {
    const rafId = rafIdRef.current.get(messageId);
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafIdRef.current.delete(messageId);
    }
    deltaBufferRef.current.delete(messageId);
  };

  const createConversation = async (title?: string): Promise<string | null> => {
    try {
      const response = await chatApiService.createConversation(title);
      if (response.success && response.data) {
        const newId = response.data.id;
        justCreatedConversationRef.current = true;
        refetchConversations();
        return newId;
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
    return null;
  };

  const sendMessageWithStreaming = async (
    conversationId: string,
    userInput: string,
    userMsgId: string,
    aiMsgId: string
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!deltaBufferRef.current.has(aiMsgId)) {
      deltaBufferRef.current.set(aiMsgId, "");
    }

    try {
      await chatApiService.sendChatMessage(
        {
          content: userInput,
          conversationId: conversationId,
        },
        {
          onStreamData: (event: StreamData) => {
            switch (event.type) {
              case StreamEventType.UserMessage:
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === userMsgId ? { ...msg, id: event.data.id } : msg))
                );
                console.log("[Stream] User message saved:", event.data.id);
                break;

              case StreamEventType.ToolCallsStart:
                console.log("[Stream] Tool calls starting:", event.data.count);
                break;

              case StreamEventType.ToolCall:
                console.log("[Stream] Tool call:", {
                  tool: event.data.tool,
                  status: event.data.status,
                });
                break;

              case StreamEventType.ToolCallsEnd:
                console.log("[Stream] Tool calls completed:", event.data.results);
                break;

              case StreamEventType.ContentStart:
                setMessages((prev) => {
                  const exists = prev.some((msg) => msg.id === aiMsgId);
                  if (!exists) {
                    const fallbackMsg: ChatMessage = {
                      id: aiMsgId,
                      role: MessageRole.ASSISTANT,
                      text: "",
                      created_at: new Date().toISOString(),
                      isStreaming: true,
                    };
                    return [...prev, fallbackMsg];
                  }
                  return prev;
                });
                break;

              case StreamEventType.ContentDelta:
                const currentBuffer = deltaBufferRef.current.get(aiMsgId) || "";
                deltaBufferRef.current.set(aiMsgId, currentBuffer + event.data.delta);

                scheduleUpdate(aiMsgId);
                break;

              case StreamEventType.Content:
                flushDeltaBuffer(aiMsgId);

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId ? { ...msg, text: (msg.text || "") + event.data.text } : msg
                  )
                );
                break;

              case StreamEventType.ContentEnd:
                flushDeltaBuffer(aiMsgId);
                break;

              case StreamEventType.Done:
                const finalBuffer = deltaBufferRef.current.get(aiMsgId) || "";
                cleanupMessageResources(aiMsgId);

                startTransition(() => {
                  setMessages((prev) => {
                    const currentMessage = prev.find((msg) => msg.id === aiMsgId);
                    const newText = (currentMessage?.text || "") + finalBuffer;
                    const newId = event.data.assistantMessageId || aiMsgId;
                    return prev.map((msg) =>
                      msg.id === aiMsgId
                        ? {
                            ...msg,
                            text: newText,
                            isStreaming: false,
                            id: newId,
                          }
                        : msg
                    );
                  });
                });
                break;

              case StreamEventType.MessageComplete:
                const completeBuffer = deltaBufferRef.current.get(aiMsgId) || "";
                cleanupMessageResources(aiMsgId);

                startTransition(() => {
                  setMessages((prev) => {
                    const currentMessage = prev.find((msg) => msg.id === aiMsgId);
                    const newText = (currentMessage?.text || "") + completeBuffer;
                    const newId = event.data.assistantMessageId || aiMsgId;
                    return prev.map((msg) =>
                      msg.id === aiMsgId
                        ? {
                            ...msg,
                            text: newText,
                            isStreaming: false,
                            id: newId,
                          }
                        : msg
                    );
                  });
                });
                break;

              case StreamEventType.Error:
                console.error("Stream error:", event.data.message);
                const errorBuffer = deltaBufferRef.current.get(aiMsgId) || "";
                cleanupMessageResources(aiMsgId);

                startTransition(() => {
                  setMessages((prev) =>
                    prev.map((msg) => {
                      if (msg.id !== aiMsgId) return msg;

                      const finalText = msg.text
                        ? msg.text + errorBuffer
                        : errorBuffer || "I encountered an error: " + event.data.message;

                      return {
                        ...msg,
                        text: finalText,
                        isStreaming: false,
                        error: true,
                      };
                    })
                  );
                });
                break;
            }
          },
          onError: (error) => {
            console.error("Chat error:", error);
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
          },
          onSuccess: () => {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg))
            );
            setIsLoading(false);
            refetchConversations();
            queryClient.invalidateQueries({
              queryKey: ["messages", conversationId],
            });
          },
          abortSignal: controller.signal,
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      flushDeltaBuffer(aiMsgId);
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
    } finally {
      cleanupMessageResources(aiMsgId);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();

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
    if (!conversationId) {
      conversationId = await createConversation(userInput);
      if (!conversationId) {
        setIsLoading(false);
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMsgId));
        return;
      }
      setCurrentConversationId(conversationId);
      router.push(`${PATH.agent}?id=${conversationId}`);
    }

    await sendMessageWithStreaming(conversationId, userInput, userMsgId, aiMsgId);
  };

  const handleNewChat = () => {
    if (messages?.length === 0) return;
    abortMessageSending();

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

    abortMessageSending();

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
    const aiMsgId = (Date.now() + 1).toString();

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

    await sendMessageWithStreaming(currentConversationId, userMessage.text, userMsgId, aiMsgId);
  };

  return {
    handleSubmit,
    handleNewChat,
    handleSelectChat,
    retryMessage,
  };
}
