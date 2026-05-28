"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { MCPModal } from "./MCPModal";
import { ChatInput } from "./components/ChatInput";
import { ChatSidebar } from "./components/ChatSidebar";
import { SidebarToggle } from "./components/SidebarToggle";
import { MobileSidebarOverlay } from "./components/MobileSidebarOverlay";
import { ChatContent } from "./components/ChatContent";
import { useConversations } from "@/hooks/chat/useConversations";
import { useMessages } from "@/hooks/chat/useMessages";
import { useChatState } from "@/hooks/chat/useChatState";
import { useChatActions } from "@/hooks/chat/useChatActions";
import { useSidebarState } from "@/hooks/chat/useSidebarState";
import { PATH } from "@/lib/constants";

interface ChatInterfaceProps {
  conversationId?: string | null;
}

export function ChatInterface({ conversationId: initialConversationId }: ChatInterfaceProps) {
  const router = useRouter();

  // Track if conversation was just created to prevent duplicate loads
  const justCreatedConversationRef = useRef(false);

  // UI States
  const [isMCPModalOpen, setIsMCPModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    initialConversationId || null
  );

  const { isSidebarOpen, setOpenMenu, isMobile } = useSidebarState();
  const {
    history,
    isHistoryLoading,
    refetchConversations,
    deleteConversation,
    isDeleting,
    updateConversation,
    isUpdating,
  } = useConversations();
  const { messagesData } = useMessages(currentConversationId);
  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    isTransitioning,
    setIsTransitioning,
  } = useChatState({
    currentConversationId,
    messagesData: messagesData?.success ? messagesData : undefined,
    justCreatedConversationRef,
  });

  const { handleSubmit, handleNewChat, handleSelectChat, retryMessage, handleAbort } = useChatActions({
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
  });

  // Sync conversation ID from props
  useEffect(() => {
    if (initialConversationId && initialConversationId !== currentConversationId) {
      setCurrentConversationId(initialConversationId);
    }
  }, [initialConversationId, currentConversationId]);

  const handleConnectTool = (toolId: string) => {
    console.log("handleConnectTool", toolId);
  };

  // Handle delete chat request
  const handleDeleteChatRequest = (chatId: string) => {
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete chat
  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;

    try {
      await deleteConversation(chatToDelete);

      // If deleting current conversation, navigate to new chat
      if (chatToDelete === currentConversationId) {
        router.push(PATH.agent);
        setCurrentConversationId(null);
        setMessages([]);
        setInput("");
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  // Handle edit chat
  const handleEditChat = async (chatId: string, title: string) => {
    try {
      await updateConversation({ conversationId: chatId, title });
    } catch (error) {
      console.error("Failed to update conversation:", error);
    }
  };

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMenu(isSidebarOpen ? null : "chat-sidebar");
    }
  }, [isMobile, isSidebarOpen, setOpenMenu]);

  const handleOpenMCP = useCallback(() => {
    setIsMCPModalOpen(true);
  }, []);

  const handleCloseMCP = useCallback(() => {
    setIsMCPModalOpen(false);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setOpenMenu(null);
  }, [setOpenMenu]);

  return (
    <div className="flex h-full bg-hyper-950 relative overflow-hidden">
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <MCPModal isOpen={isMCPModalOpen} onClose={handleCloseMCP} onConnect={handleConnectTool} />

      {/* Sidebar - Desktop: Fixed, Mobile: Overlay */}
      <div className="hidden md:block relative z-20">
        <ChatSidebar
          isOpen={isSidebarOpen}
          history={history}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChatRequest}
          onEditChat={handleEditChat}
          currentChatId={currentConversationId}
          isLoading={isHistoryLoading}
          isUpdating={isUpdating}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebarOverlay
        isOpen={isSidebarOpen}
        history={history}
        currentChatId={currentConversationId}
        isLoading={isHistoryLoading}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChatRequest}
        onEditChat={handleEditChat}
        isUpdating={isUpdating}
        onClose={handleCloseSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden z-10">
        <SidebarToggle
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
          onToggle={handleToggleSidebar}
        />

        <ChatContent
          isTransitioning={isTransitioning}
          messages={messages}
          isLoading={isLoading}
          onSuggestionClick={setInput}
          onRetry={retryMessage}
        />

        {/* Chat Input - Fixed at bottom */}
        <div className="shrink-0">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onOpenMCP={handleOpenMCP}
            onAbort={handleAbort}
          />
        </div>
      </div>
    </div>
  );
}
