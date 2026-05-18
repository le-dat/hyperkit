import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  variant?: "default" | "accent";
  showLabel?: boolean;
  label?: string;
}

function ProgressBar({
  className,
  value,
  variant = "default",
  showLabel = false,
  label,
  ...props
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabel && label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-hyper-400">{label}</span>
          <span className="text-xs text-hyper-400">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
      <div
        className={cn("h-1 w-full overflow-hidden rounded-full", {
          "bg-hyper-900": variant === "default",
          "bg-hyper-800": variant === "accent",
        })}
      >
        <div
          className={cn("h-full transition-all duration-500 ease-out", {
            "bg-hyper-accent": variant === "default" || variant === "accent",
          })}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export { ProgressBar };
