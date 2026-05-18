import { ChatMessage, MessageRole } from "@/types";
import { memo, type ReactNode, useState, useEffect, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { RotateCcw } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
}

// Constants
const MARKDOWN_PLUGINS = {
  remark: [remarkGfm] as const,
  rehype: [rehypeHighlight, rehypeRaw] as const,
};

const STREAMING_DOTS_COUNT = 3;

// Styling utilities
function getBubbleClasses(isUser: boolean): string {
  const baseClasses = ["min-w-0", "w-full", "break-words"];
  const roleClasses = isUser
    ? "px-4 py-3 md:px-5 text-white"
    : "px-4 py-4 md:px-5 md:py-5 text-hyper-100";
  return [...baseClasses, roleClasses].join(" ");
}

function getCodeBackgroundClass(isUser: boolean): string {
  return isUser ? "bg-hyper-900" : "bg-hyper-800";
}

function getTableClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-700" : "border-hyper-800";
  return `min-w-full border ${borderClass}`;
}

function getThClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-700" : "border-hyper-800";
  return `border ${borderClass} bg-hyper-900 px-4 py-2 text-left font-semibold`;
}

function getTdClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-700" : "border-hyper-800";
  return `border ${borderClass} px-4 py-2`;
}

function getBlockquoteClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-600" : "border-hyper-700";
  return `border-l-4 ${borderClass} pl-4 italic`;
}

// Markdown component types
interface MarkdownComponentProps {
  children?: ReactNode;
  className?: string;
}

interface CodeProps extends MarkdownComponentProps {
  className?: string;
}

interface LinkProps extends MarkdownComponentProps {
  href?: string;
}

// Markdown components factory
function createMarkdownComponents(isUser: boolean): Components {
  const codeBgClass = getCodeBackgroundClass(isUser);

  return {
    code: ({ className, children, ...rest }: CodeProps) => {
      const isInline = !className?.includes("language-");

      if (isInline) {
        return (
          <code className={`${codeBgClass} text-hyper-100 px-1.5 py-0.5 rounded text-xs`} {...rest}>
            {children}
          </code>
        );
      }

      return (
        <code
          className={`${className} block ${codeBgClass} p-3 rounded-lg overflow-x-auto`}
          {...rest}
        >
          {children}
        </code>
      );
    },
    a: ({ children, href, ...rest }: LinkProps) => (
      <a
        className="text-blue-400 hover:text-blue-300 underline"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    ),
    ul: ({ children, ...rest }: MarkdownComponentProps) => (
      <ul className="list-disc list-outside ml-6 space-y-2 my-2" {...rest}>
        {children}
      </ul>
    ),
    ol: ({ children, ...rest }: MarkdownComponentProps) => (
      <ol className="list-decimal list-outside ml-6 space-y-2 my-2" {...rest}>
        {children}
      </ol>
    ),
    li: ({ children, ...rest }: MarkdownComponentProps) => (
      <li className="pl-2 leading-relaxed" {...rest}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...rest }: MarkdownComponentProps) => (
      <blockquote className={getBlockquoteClasses(isUser)} {...rest}>
        {children}
      </blockquote>
    ),
    table: ({ children, ...rest }: MarkdownComponentProps) => (
      <div className="overflow-x-auto">
        <table className={getTableClasses(isUser)} {...rest}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...rest }: MarkdownComponentProps) => (
      <th className={getThClasses(isUser)} {...rest}>
        {children}
      </th>
    ),
    td: ({ children, ...rest }: MarkdownComponentProps) => (
      <td className={getTdClasses(isUser)} {...rest}>
        {children}
      </td>
    ),
  };
}

function StreamingIndicator({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 mt-2 min-h-[20px] transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {Array.from({ length: STREAMING_DOTS_COUNT }, (_, i) => {
        const delayClass = i === 1 ? "delay-100" : i === 2 ? "delay-200" : "";
        return (
          <div
            key={i}
            className={`w-2 h-2 bg-hyper-500 rounded-full animate-bounce ${delayClass}`}
          />
        );
      })}
    </div>
  );
}

function MessageHeader({ timestamp }: { timestamp: string }) {
  return (
    <div className="w-full flex items-center gap-2 mb-2 font-mono text-xs text-hyper-accent pb-1">
      <span className="animate-pulse">▸</span>
      <span>HYPERKIT AI</span>
      <span className="text-hyper-600 ml-auto">{new Date(timestamp).toLocaleTimeString()}</span>
    </div>
  );
}

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  const baseClasses = "text-sm md:text-base leading-6 md:leading-7 prose prose-invert";
  const wrapperClasses = isUser ? "bg-hyper-700 rounded-lg px-3 py-2 w-fit max-w-full ml-auto" : "";

  const markdownContent = (
    <ReactMarkdown
      remarkPlugins={[...MARKDOWN_PLUGINS.remark]}
      rehypePlugins={[...MARKDOWN_PLUGINS.rehype]}
      components={createMarkdownComponents(isUser)}
    >
      {content}
    </ReactMarkdown>
  );

  if (isUser) {
    return (
      <div className={wrapperClasses}>
        <div className={baseClasses}>{markdownContent}</div>
      </div>
    );
  }

  return <div className={baseClasses}>{markdownContent}</div>;
}

function RetryButton({
  messageId,
  onRetry,
}: {
  messageId: string;
  onRetry?: (id: string) => void;
}) {
  if (!onRetry) return null;

  return (
    <button
      onClick={() => onRetry(messageId)}
      className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-hyper-300 hover:text-hyper-100 bg-hyper-800 hover:bg-hyper-700 rounded-lg transition-colors border border-hyper-700 hover:border-hyper-600"
    >
      <RotateCcw className="w-4 h-4" />
      <span>Retry</span>
    </button>
  );
}

export const MessageBubble = memo(
  function MessageBubble({ message, onRetry }: MessageBubbleProps) {
    const isUser = message.role === MessageRole.USER;
    const containerClasses = `flex gap-3 md:gap-4 ${isUser ? "justify-end" : ""}`;
    const [showIndicator, setShowIndicator] = useState(message.isStreaming);
    const prevStreamingRef = useRef(message.isStreaming);

    useEffect(() => {
      const wasStreaming = prevStreamingRef.current;
      const isStreaming = message.isStreaming ?? false;

      if (isStreaming !== wasStreaming) {
        if (isStreaming) {
          requestAnimationFrame(() => {
            setShowIndicator(true);
          });
        } else {
          const timer = setTimeout(() => {
            setShowIndicator(false);
          }, 300);
          prevStreamingRef.current = isStreaming;
          return () => clearTimeout(timer);
        }
      }

      prevStreamingRef.current = isStreaming;
    }, [message.isStreaming]);

    return (
      <div className={containerClasses}>
        <div className={getBubbleClasses(isUser)}>
          {!isUser && <MessageHeader timestamp={message.created_at} />}
          <MarkdownContent content={message.text || ""} isUser={isUser} />
          {showIndicator && <StreamingIndicator isVisible={message.isStreaming ?? false} />}
          {message.error && !isUser && <RetryButton messageId={message.id} onRetry={onRetry} />}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prev = prevProps.message;
    const next = nextProps.message;

    return (
      prev.id === next.id &&
      prev.text === next.text &&
      prev.isStreaming === next.isStreaming &&
      prev.role === next.role &&
      prev.error === next.error &&
      prevProps.onRetry === nextProps.onRetry
    );
  }
);
