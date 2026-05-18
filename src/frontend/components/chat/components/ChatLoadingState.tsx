"use client";

import { useMemo } from "react";

export const ChatAiMessageHeading = () => {
  return (
    <div className="flex items-center gap-2 mb-2 font-mono text-xs text-hyper-accent pb-1">
      <span className="animate-pulse">▸</span>
      <span>HYPERKIT AI</span>
    </div>
  );
};

const SKELETON_BUBBLES = [
  {
    // AI Message Bubble (long)
    role: "ai",
    bubble: (
      <div className="flex w-1/2" key="ai1">
        <div className="w-full px-4 py-4 md:px-5 md:py-5 flex flex-col gap-3 relative overflow-hidden">
          <ChatAiMessageHeading />
          <div className="h-3 bg-hyper-700/40 rounded w-4/5 relative z-10" />
          <div className="h-3 bg-hyper-700/40 rounded w-full relative z-10" />
          <div className="h-3 bg-hyper-700/40 rounded w-5/6 relative z-10" />
          <div className="h-3 bg-hyper-700/40 rounded w-7/12 relative z-10" />
        </div>
      </div>
    ),
  },
  {
    // User Message Bubble (medium)
    role: "human",
    bubble: (
      <div className="flex justify-end w-full" key="human1">
        <div className="w-1/2 px-4 py-3 md:px-5 flex flex-col items-end gap-3 relative overflow-hidden">
          <div className="h-3 bg-hyper-700/30 rounded w-11/12 relative z-10" />
          <div className="h-3 bg-hyper-700/30 rounded w-4/5 relative z-10" />
          <div className="h-3 bg-hyper-700/30 rounded w-3/4 relative z-10" />
        </div>
      </div>
    ),
  },
  {
    // AI Message Bubble (medium)
    role: "ai",
    bubble: (
      <div className="flex w-1/2" key="ai2">
        <div className="w-full px-4 py-4 md:px-5 md:py-5 flex flex-col gap-3 relative overflow-hidden">
          <ChatAiMessageHeading />
          <div className="h-3 bg-hyper-700/40 rounded w-full relative z-10" />
          <div className="h-3 bg-hyper-700/40 rounded w-10/12 relative z-10" />
          <div className="h-3 bg-hyper-700/40 rounded w-2/3 relative z-10" />
        </div>
      </div>
    ),
  },
  {
    // User Message Bubble (short)
    role: "human",
    bubble: (
      <div className="flex justify-end w-full" key="human2">
        <div className="w-1/2 px-4 py-3 md:px-5 flex flex-col items-end gap-3 relative overflow-hidden">
          <div className="h-3 bg-hyper-700/30 rounded w-1/2 relative z-10" />
        </div>
      </div>
    ),
  },
  {
    // AI Typing indicator
    role: "ai",
    bubble: (
      <div className="flex w-1/2 items-end gap-2" key="ai3">
        <div className="w-full px-4 py-4 md:px-5 md:py-5 flex flex-col gap-4 relative overflow-hidden">
          <ChatAiMessageHeading />
          <div className="h-3 bg-hyper-700/40 rounded w-10/12 relative z-10" />
        </div>
      </div>
    ),
  },
];

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ChatLoadingState() {
  // Randomize skeleton bubbles only on first mount
  const randomizedBubbles = useMemo(() => shuffle(SKELETON_BUBBLES), []);

  return (
    <div className="h-full w-full overflow-y-auto bg-hyper-950 flex flex-col items-center justify-center">
      <div className="w-full flex justify-center h-full">
        <div className="w-full max-w-4xl px-4 pt-8 md:pt-14 pb-4 md:pb-8 flex flex-col gap-5 md:gap-8">
          {randomizedBubbles.map((item) => (
            <div key={item.bubble.key}>{item.bubble}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
