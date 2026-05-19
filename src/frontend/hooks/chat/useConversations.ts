import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { chatApiService } from "@/service/chatApiService";
import { ChatSession } from "@/types";
import { transformConversationsToChatSessions } from "@/lib/chat/messageTransformers";
import { getErrorMessage } from "@/lib/api/apiUtils";

export function useConversations() {
  const queryClient = useQueryClient();

  const {
    data: conversationsData,
    isLoading: isHistoryLoading,
    refetch: refetchConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => chatApiService.getConversations({ limit: 10, cursor: "" }),
  });

  useEffect(() => {
    if (conversationsError) {
      toast.error("Failed to load conversations", {
        description: getErrorMessage(conversationsError),
      });
    }
  }, [conversationsError]);

  const { mutateAsync: deleteConversation, isPending: isDeleting } =
    useMutation({
      mutationFn: (conversationId: string) =>
        chatApiService.deleteConversation(conversationId),
      onSuccess: () => {
        toast.success("Conversation deleted");
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      },
      onError: (error) => {
        toast.error("Failed to delete conversation", {
          description: getErrorMessage(error),
        });
      },
    });

  const { mutateAsync: updateConversation, isPending: isUpdating } =
    useMutation({
      mutationFn: ({
        conversationId,
        title,
      }: {
        conversationId: string;
        title: string;
      }) => chatApiService.updateConversationTitle(conversationId, title),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      },
      onError: (error) => {
        toast.error("Failed to update conversation title", {
          description: getErrorMessage(error),
        });
      },
    });

  const history: ChatSession[] =
    conversationsData?.success && conversationsData.data
      ? transformConversationsToChatSessions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (Array.isArray(conversationsData.data)
            ? conversationsData.data
            : (conversationsData.data as { items?: unknown[] }).items || []) as unknown[]
        )
      : [];

  return {
    history,
    isHistoryLoading,
    refetchConversations,
    deleteConversation,
    isDeleting,
    updateConversation,
    isUpdating,
  };
}
