import { ChatSidebar } from "./ChatSidebar";
import { ChatSession } from "@/types";

interface MobileSidebarOverlayProps {
  isOpen: boolean;
  history: ChatSession[];
  currentChatId: string | null;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onEditChat?: (id: string, title: string) => Promise<void>;
  isUpdating?: boolean;
  onClose: () => void;
}

export function MobileSidebarOverlay({
  isOpen,
  history,
  currentChatId,
  isLoading,
  isError,
  onRetry,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onEditChat,
  isUpdating,
  onClose,
}: MobileSidebarOverlayProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20 animate-fade-in"
        onClick={onClose}
      />
      <div className="md:hidden fixed top-[63px] bottom-0 left-0 z-50 animate-slide-in-left">
        <ChatSidebar
          isOpen={true}
          history={history}
          onNewChat={() => {
            onNewChat();
            onClose();
          }}
          onSelectChat={(id) => {
            onSelectChat(id);
            onClose();
          }}
          onDeleteChat={onDeleteChat}
          onEditChat={onEditChat}
          currentChatId={currentChatId}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
          isUpdating={isUpdating}
        />
      </div>
    </>
  );
}
