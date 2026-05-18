import { ChatSession } from "@/types";
import { ConversationEditForm } from "./ConversationEditForm";
import { ConversationMenu } from "./ConversationMenu";

interface ConversationItemProps {
  item: ChatSession;
  isActive: boolean;
  isHovered: boolean;
  isEditing: boolean;
  editTitle: string;
  isMenuOpen: boolean;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  isUpdating?: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  onEditTitleChange: (title: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onToggleMenu: (e: React.MouseEvent) => void;
  onMenuEdit: () => void;
  onMenuDelete: () => void;
  onEditChat?: (id: string, title: string) => Promise<void>;
  onDeleteChat?: (id: string) => void;
}

export function ConversationItem({
  item,
  isActive,
  isHovered,
  isEditing,
  editTitle,
  isMenuOpen,
  menuRef,
  buttonRef,
  isUpdating = false,
  onSelect,
  onHover,
  onEditTitleChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleMenu,
  onMenuEdit,
  onMenuDelete,
  onEditChat,
  onDeleteChat,
}: ConversationItemProps) {
  if (isEditing) {
    return (
      <div
        className="relative group"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        <ConversationEditForm
          title={editTitle}
          onChange={onEditTitleChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          isUpdating={isUpdating}
        />
      </div>
    );
  }

  return (
    <div
      className="relative group"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        onClick={onSelect}
        className={`
          w-full text-left p-3 rounded-lg transition-all duration-200
          ${
            isActive
              ? "bg-hyper-800 border border-hyper-700 shadow-sm pr-12"
              : "hover:bg-hyper-800/50 border border-transparent pr-12"
          }
        `}
      >
        <div
          className={`
            text-sm font-medium truncate transition-colors
            ${isActive ? "text-white" : "text-hyper-200"}
          `}
        >
          {item.title}
        </div>
        <div
          className={`
            text-xs truncate transition-colors
            ${isActive ? "text-hyper-400" : "text-hyper-500"}
          `}
        >
          {item.preview}
        </div>
      </button>

      {(onEditChat || onDeleteChat) && (
        <ConversationMenu
          isOpen={isMenuOpen}
          isHovered={isHovered}
          menuRef={menuRef}
          buttonRef={buttonRef}
          onToggle={onToggleMenu}
          onEdit={onMenuEdit}
          onDelete={onMenuDelete}
        />
      )}
    </div>
  );
}
