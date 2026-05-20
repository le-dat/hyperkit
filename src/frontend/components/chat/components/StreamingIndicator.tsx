import React from "react";

const STREAMING_DOTS_COUNT = 3;

interface StreamingIndicatorProps {
  isVisible: boolean;
}

export function StreamingIndicator({ isVisible }: StreamingIndicatorProps) {
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
