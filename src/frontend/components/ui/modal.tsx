"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  className?: string;
}

function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  showCloseButton = true,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]",
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative bg-hyper-950 border border-hyper-800 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-auto",
          sizeClasses[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-3 right-4 p-2 hover:bg-hyper-800 rounded-lg text-hyper-400 hover:text-white transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface ModalHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: string | React.ReactNode;
  description?: string;
}

function ModalHeader({
  className,
  title,
  description,
  children,
  ...props
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "p-3 md:p-4 border-b border-hyper-800 bg-hyper-900",
        className,
      )}
      {...props}
    >
      {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
      {description && (
        <p className="text-sm text-hyper-400 mt-1">{description}</p>
      )}
      {children}
    </div>
  );
}

function ModalContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 overflow-y-auto", className)} {...props} />;
}

function ModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-6 border-t border-hyper-800 bg-hyper-900 flex justify-end gap-3",
        className,
      )}
      {...props}
    />
  );
}

export { Modal, ModalHeader, ModalContent, ModalFooter };
