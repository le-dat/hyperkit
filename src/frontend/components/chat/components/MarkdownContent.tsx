import React, { type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import {
  getCodeBackgroundClass,
  getTableClasses,
  getThClasses,
  getTdClasses,
  getBlockquoteClasses,
} from "./bubbleStyles";

const MARKDOWN_PLUGINS = {
  remark: [remarkGfm] as const,
  rehype: [rehypeHighlight, rehypeRaw] as const,
};

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

interface MarkdownContentProps {
  content: string;
  isUser: boolean;
}

export function MarkdownContent({ content, isUser }: MarkdownContentProps) {
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
