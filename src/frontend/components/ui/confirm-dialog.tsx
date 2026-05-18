import { useHotKey } from "@/hooks/useHotKey";
import { Loader2, X } from "lucide-react";
import { useEffect } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  useHotKey("Escape", () => onClose(), {
    enabled: isOpen,
  });
  useHotKey("Enter", () => onConfirm(), {
    enabled: isOpen,
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-orange-600 hover:bg-orange-700 text-white",
    default: "bg-hyper-accent hover:bg-hyper-accentHover text-white",
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-hyper-900 border border-hyper-700 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-down">
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-1.5 text-hyper-400 hover:text-white hover:bg-hyper-800 rounded-lg transition-colors${
            isLoading ? " opacity-60 pointer-events-none" : ""
          }`}
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-hyper-400 text-sm">{description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className={`flex-1 px-4 py-2.5 bg-hyper-800 hover:bg-hyper-700 text-white rounded-xl transition-colors font-medium text-sm${
              isLoading ? " opacity-60 pointer-events-none" : ""
            }`}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 px-4 py-2.5 flex items-center justify-center gap-2 rounded-xl transition-colors font-medium text-sm ${
              variantStyles[variant]
            }${isLoading ? " opacity-60 pointer-events-none" : ""}`}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
