import { useQuery } from "@tanstack/react-query";
import { chatApiService } from "@/service/chatApiService";

export function useMessages(conversationId: string | null) {
  const { data: messagesData } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      chatApiService.getMessages(conversationId as string, {
        limit: 10,
        cursor: "",
      }),
    enabled: !!conversationId,
  });

  return {
    messagesData,
  };
}
