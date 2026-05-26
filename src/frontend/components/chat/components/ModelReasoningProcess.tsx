import { Brain, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

interface ModelReasoningProcessProps {
  thoughts?: string;
  isThinking?: boolean;
}

function useModelReasoningState() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen((prev) => !prev);
  return { isOpen, toggle };
}

interface ReasoningHeaderProps {
  isOpen: boolean;
  isThinking?: boolean;
  onToggle: () => void;
}

function ReasoningHeader({ isOpen, isThinking, onToggle }: ReasoningHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-hyper-800/10 text-hyper-400 hover:text-hyper-200 transition-colors"
    >
      <Brain
        className={`w-3.5 h-3.5 shrink-0 ${
          isThinking ? "text-hyper-accent animate-pulse" : "text-hyper-400"
        }`}
      />
      <span className="font-sans font-semibold flex-1 text-left select-none text-hyper-300">
        {isThinking ? "Thinking Process..." : "Thought Process"}
      </span>
      {isThinking && (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-hyper-accent shrink-0" />
      )}
      {isOpen ? (
        <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
      ) : (
        <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
      )}
    </button>
  );
}

interface ReasoningBodyProps {
  isOpen: boolean;
  thoughts: string;
}

function ReasoningBody({ isOpen, thoughts }: ReasoningBodyProps) {
  if (!isOpen) return null;
  return (
    <div className="px-4 py-3 bg-hyper-950/10 border-t border-hyper-800/40">
      <MarkdownContent
        content={thoughts}
        isUser={false}
        className="text-xs text-slate-400/90 leading-relaxed font-sans prose prose-xs prose-invert"
      />
    </div>
  );
}

export function ModelReasoningProcess({ thoughts, isThinking }: ModelReasoningProcessProps) {
  const { isOpen, toggle } = useModelReasoningState();

  if (!thoughts) return null;

  return (
    <div className="mb-4 rounded-xl border border-hyper-800/40 bg-hyper-900/10 overflow-hidden text-xs max-w-3xl">
      <ReasoningHeader isOpen={isOpen} isThinking={isThinking} onToggle={toggle} />
      <ReasoningBody isOpen={isOpen} thoughts={thoughts} />
    </div>
  );
}
