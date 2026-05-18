"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useLayoutEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface MenuAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  show?: boolean;
}

interface ConversationMenuProps {
  isOpen: boolean;
  isHovered: boolean;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onToggle: (e: React.MouseEvent) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ConversationMenu({
  isOpen,
  isHovered,
  menuRef,
  buttonRef: externalButtonRef,
  onToggle,
  onEdit,
  onDelete,
}: ConversationMenuProps) {
  const internalButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const currentButtonRefRef = useRef<React.RefObject<HTMLButtonElement | null>>(
    externalButtonRef || internalButtonRef,
  );

  useLayoutEffect(() => {
    currentButtonRefRef.current = externalButtonRef || internalButtonRef;
  }, [externalButtonRef]);

  useEffect(() => {
    if (isOpen && currentButtonRefRef.current?.current) {
      const updatePosition = () => {
        if (currentButtonRefRef.current?.current) {
          const rect =
            currentButtonRefRef.current.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.top + rect.height / 2,
            left: rect.right + 8, // ml-2 = 8px
          });
        }
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  const buttonRef = externalButtonRef || internalButtonRef;

  const actions: MenuAction[] = [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil className="w-4 h-4" />,
      onClick: onEdit ?? (() => {}),
      className:
        "w-full flex items-center gap-2 px-3 py-2 text-sm text-hyper-200 hover:bg-hyper-700 text-white transition-colors text-left",
      show: !!onEdit,
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete ?? (() => {}),
      className:
        "w-full flex items-center gap-2 px-3 py-2 text-sm text-hyper-200 hover:bg-red-500/10 text-white hover:text-red-400 transition-colors text-left border-t border-hyper-700",
      show: !!onDelete,
    },
  ];

  if (!actions.some((action) => action.show)) return null;

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      className="fixed w-40 bg-hyper-800 border border-hyper-700 rounded-lg shadow-lg z-50 overflow-hidden"
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        transform: "translateY(-50%)",
        animation: "fade-in 0.15s ease-out",
      }}
    >
      {actions
        .filter((action) => action.show)
        .map((action) => (
          <button
            key={action.key}
            onClick={action.onClick}
            className={action.className}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
    </div>
  ) : null;

  return (
    <>
      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-30">
        <button
          ref={buttonRef}
          onClick={onToggle}
          className={`
            absolute top-1/2 -translate-y-1/2 right-2
            flex justify-end items-center
            p-1.5 rounded-lg text-hyper-500 hover:text-white hover:bg-hyper-700
            transition-all duration-200
            ${
              isHovered || isOpen
                ? "opacity-100 scale-100"
                : "opacity-0 scale-90 pointer-events-none"
            }
            ${isOpen ? "bg-hyper-700 text-white" : ""}
          `}
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      {menuContent &&
        typeof window !== "undefined" &&
        createPortal(menuContent, document.body)}
    </>
  );
}
