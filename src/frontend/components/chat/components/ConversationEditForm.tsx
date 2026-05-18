import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ConversationEditFormProps {
  title: string;
  onChange: (title: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

export function ConversationEditForm({
  title,
  onChange,
  onSave,
  onCancel,
  isUpdating = false,
}: ConversationEditFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) {
      onSave();
    }
  };

  return (
    <div className="p-3 rounded-lg bg-hyper-800 border border-hyper-700 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className="w-full bg-hyper-900 border border-hyper-700 rounded-lg px-3 py-2 text-sm text-white placeholder-hyper-500 focus:outline-none focus:ring-2 focus:ring-hyper-accent focus:border-transparent mb-2"
        placeholder="Enter conversation title..."
      />
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={isUpdating}
          className="p-1.5 rounded-lg text-hyper-400 hover:text-white hover:bg-hyper-700 transition-all duration-200 disabled:opacity-50"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={isUpdating || !title.trim()}
          className="p-1.5 rounded-lg text-hyper-400 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200 disabled:opacity-50"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
