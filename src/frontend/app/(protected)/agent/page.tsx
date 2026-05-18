import { ChatInterface } from "@/components/chat/ChatInterface";
import ParamRedirect from "@/components/auth/ParamRedirect";

interface AgentPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AgentPage({ searchParams }: AgentPageProps) {
  const params = await searchParams;
  const conversationId = typeof params.id === "string" ? params.id : null;

  return (
    <ParamRedirect>
      <div className="h-full w-full overflow-hidden">
        <ChatInterface conversationId={conversationId} />
      </div>
    </ParamRedirect>
  );
}
