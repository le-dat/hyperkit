import { Textarea } from "@/components/ui/input";
import { ArrowUp, Box, Square } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, memo, useCallback } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onOpenMCP?: () => void;
  onAbort?: () => void;
}

function ChatInputComponent({
  value,
  onChange,
  onSubmit,
  isLoading,
  onOpenMCP,
  onAbort,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const containerClassName = useMemo(() => {
    const baseClasses =
      "relative glass-strong rounded-2xl shadow-2xl transition-all duration-300";
    return baseClasses;
  }, []);

  const buttonClassName = useMemo(() => {
    const baseClasses = "p-2 rounded-xl transition-all duration-200";
    return value?.trim()
      ? `${baseClasses} bg-gradient-to-r from-hyper-accent to-orange-500 text-white shadow-lg shadow-hyper-accent/50 hover:scale-105 active:scale-95`
      : `${baseClasses} bg-hyper-800 text-hyper-600 cursor-not-allowed`;
  }, [value]);

  const hasValue = useMemo(() => !!value?.trim(), [value]);

  return (
    <div className="w-full bg-hyper-950 p-4 pb-6">
      <div className="max-w-4xl mx-auto">
        <div className={containerClassName}>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Hyperkit to build something..."
            rows={1}
          />

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
            {onOpenMCP && (
              <button
                type="button"
                onClick={onOpenMCP}
                className="p-2 text-hyper-400 hover:text-white hover:bg-hyper-800 rounded-lg transition-colors"
                title="Add MCP Connection"
              >
                <Box className="w-5 h-5" />
              </button>
            )}

            {isLoading && onAbort ? (
              <button
                type="button"
                onClick={onAbort}
                className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
                title="Stop generating"
              >
                <Square className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!hasValue || isLoading}
                className={buttonClassName}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ChatInput = memo(ChatInputComponent);
