import { useConversationItem } from "@/hooks/chat/useConversationItem";
import { ChatSession } from "@/types";
import { FileText, RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConversationItem } from "./ConversationItem";

interface ConversationItemWrapperProps {
  item: ChatSession;
  isActive: boolean;
  isHovered: boolean;
  isUpdating?: boolean;
  onSelectChat?: (id: string) => void;
  onEditChat?: (id: string, title: string) => Promise<void>;
  onDeleteChat?: (id: string) => void;
  onHover: (hovered: boolean) => void;
}

function ConversationItemWrapper({
  item,
  isActive,
  isHovered,
  isUpdating,
  onSelectChat,
  onEditChat,
  onDeleteChat,
  onHover,
}: ConversationItemWrapperProps) {
  const {
    isEditing,
    editTitle,
    isMenuOpen,
    menuRef,
    buttonRef,
    setEditTitle,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleToggleMenu,
    handleMenuEdit,
    handleMenuDelete,
  } = useConversationItem({
    item,
    onEditChat,
    onDeleteChat,
  });

  return (
    <ConversationItem
      item={item}
      isActive={isActive}
      isHovered={isHovered}
      isEditing={isEditing}
      editTitle={editTitle}
      isMenuOpen={isMenuOpen}
      menuRef={menuRef}
      buttonRef={buttonRef}
      isUpdating={isUpdating}
      onSelect={() => onSelectChat?.(item.id)}
      onHover={onHover}
      onEditTitleChange={setEditTitle}
      onStartEdit={handleStartEdit}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={handleCancelEdit}
      onToggleMenu={handleToggleMenu}
      onMenuEdit={handleMenuEdit}
      onMenuDelete={handleMenuDelete}
      onEditChat={onEditChat}
      onDeleteChat={onDeleteChat}
    />
  );
}

interface ChatSidebarProps {
  isOpen: boolean;
  history: ChatSession[];
  onNewChat: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onEditChat?: (id: string, title: string) => Promise<void>;
  currentChatId?: string | null;
  isLoading?: boolean;
  isUpdating?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function ChatSidebar({
  isOpen,
  history,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onEditChat,
  currentChatId,
  isLoading = false,
  isUpdating = false,
  isError = false,
  onRetry,
}: ChatSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={`
        h-full bg-hyper-900/30 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300 animate-slide-in-left
        ${isOpen ? "w-72 md:w-64 translate-x-0" : "w-0 -translate-x-full opacity-0 overflow-hidden"}
      `}
    >
      {/* Terminal Header */}
      <div className="p-4 border-b border-white/5">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 glass-strong hover:bg-hyper-800/80 text-white p-3 rounded-xl transition-all duration-200 border border-white/10 hover:border-hyper-accent/50 font-mono text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] hover:shadow-hyper-accent/20"
        >
          <FileText className="w-4 h-4" />
          <span>NEW CHAT</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        <div className="px-3 py-2 text-xs font-mono font-semibold text-hyper-500 uppercase tracking-wider flex items-center gap-2">
          <span className="text-hyper-accent animate-pulse">▸</span>
          <span>RECENT</span>
        </div>
        {isLoading ? (
          // Loading skeleton
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-lg border border-transparent animate-pulse">
                <div className="h-4 bg-hyper-800 rounded mb-2 w-3/4" />
                <div className="h-3 bg-hyper-800/70 rounded w-1/2" />
              </div>
            ))}
          </>
        ) : isError ? (
          // Error state
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-2 mt-2 p-4 rounded-xl border border-white/10 flex flex-col items-center gap-3 text-center"
          >
            <div className="p-2 rounded-full">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-mono font-semibold uppercase tracking-wide">Load failed</p>
              <p className="text-xs text-hyper-500 mt-0.5">Couldn&apos;t fetch conversations</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-white border border-white/10 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              >
                <RefreshCw className="w-3 h-3" />
                Try Again
              </button>
            )}
          </motion.div>
        ) : history.length === 0 ? (
          <div className="px-3 py-8 text-center text-hyper-500 text-sm">No conversations yet</div>
        ) : (
          <AnimatePresence mode="popLayout">
            {history.map((item) => {
              const isActive = item.id === currentChatId;
              const isHovered = hoveredId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  layout
                >
                  <ConversationItemWrapper
                    item={item}
                    isActive={isActive}
                    isHovered={isHovered}
                    isUpdating={isUpdating}
                    onSelectChat={onSelectChat}
                    onEditChat={onEditChat}
                    onDeleteChat={onDeleteChat}
                    onHover={(hovered) => setHoveredId(hovered ? item.id : null)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Social Icons Footer */}
      {/* <div
        className={`
          border-t border-hyper-800 p-4 mt-auto transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0"}
        `}
      >
        {isOpen && (
          <>
            <div className="flex items-center justify-center gap-2">
              <a
                href={SOCIAL_LINKS.TWITTER}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-hyper-400 hover:text-white hover:bg-hyper-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-hyper-accent"
                aria-label="Follow us on X/Twitter"
                title="Follow @hyperkit on X/Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>

              <a
                href={SOCIAL_LINKS.TELEGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-hyper-400 hover:text-white hover:bg-hyper-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-hyper-accent"
                aria-label="Join us on Telegram"
                title="Join our Telegram community"
              >
                <Send className="w-4 h-4" />
              </a>

              <a
                href={SOCIAL_LINKS.EMAIL}
                className="p-2 text-hyper-400 hover:text-white hover:bg-hyper-800 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-hyper-accent"
                aria-label="Email us"
                title="Contact us via email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            <div className="text-center mt-3 text-[10px] text-hyper-600 font-mono">
              Join the community
            </div>
          </>
        )}
      </div> */}
    </div>
  );
}
