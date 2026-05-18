"use client";

import { useEffect, useState } from "react";

interface TerminalTextProps {
  text: string;
  delay?: number;
}

export function TerminalText({ text, delay = 0 }: TerminalTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        }
      },
      delay + currentIndex * 2,
    );

    return () => clearTimeout(timeout);
  }, [currentIndex, text, delay]);

  return (
    <>
      {displayText}
      {currentIndex < text.length && <span className="animate-pulse">│</span>}
    </>
  );
}
