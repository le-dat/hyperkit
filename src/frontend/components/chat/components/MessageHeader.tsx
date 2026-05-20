import React from "react";

interface MessageHeaderProps {
  timestamp: string;
}

export function MessageHeader({ timestamp }: MessageHeaderProps) {
  return (
    <div className="w-full flex items-center gap-2 mb-2 font-mono text-xs text-hyper-accent pb-1">
      <span className="animate-pulse">▸</span>
      <span>HYPERKIT AI</span>
      <span className="text-hyper-600 ml-auto">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}
