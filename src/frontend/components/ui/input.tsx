/* eslint-disable @typescript-eslint/no-empty-object-type */
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function handleMobileFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    e.target.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, ...props }, ref) => {
    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        handleMobileFocus(e);
        onFocus?.(e);
      },
      [onFocus]
    );

    return (
      <input
        type={type}
        className={cn(
          "flex w-full bg-hyper-900 border border-hyper-700 text-white rounded-xl px-4 py-3 text-sm",
          "focus:outline-none focus:border-hyper-accent/50 focus:ring-1 focus:ring-hyper-accent/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "placeholder:text-hyper-500",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onFocus, ...props }, ref) => {
    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        handleMobileFocus(e);
        onFocus?.(e);
      },
      [onFocus]
    );

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full bg-hyper-900 border border-hyper-700 text-white rounded-xl px-4 py-3 text-sm",
          "focus:outline-none ",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "placeholder:text-hyper-500 resize-none",
          className
        )}
        ref={ref}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex w-full bg-hyper-900 border border-hyper-700 text-white rounded-xl px-4 py-3 text-sm",
          "focus:outline-none focus:border-hyper-accent focus:ring-1 focus:ring-hyper-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Input, Textarea, Select };
