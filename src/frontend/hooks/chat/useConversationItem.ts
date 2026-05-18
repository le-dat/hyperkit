import { useState, useEffect, useRef } from "react";
import { ChatSession } from "@/types";

interface UseConversationItemProps {
  item: ChatSession;
  onEditChat?: (id: string, title: string) => Promise<void>;
  onDeleteChat?: (id: string) => void;
}

export function useConversationItem({
  item,
  onEditChat,
  onDeleteChat,
}: UseConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditTitle(item.title);
    setIsMenuOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(item.title);
  };

  const handleSaveEdit = async () => {
    if (!onEditChat || !editTitle.trim()) return;

    const trimmedTitle = editTitle.trim();
    await onEditChat(item.id, trimmedTitle);
    setIsEditing(false);
  };

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const handleMenuEdit = () => {
    handleStartEdit();
  };

  const handleMenuDelete = () => {
    setIsMenuOpen(false);
    if (onDeleteChat) {
      onDeleteChat(item.id);
    }
  };

  return {
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
  };
}
