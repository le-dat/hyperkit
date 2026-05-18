"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fixed inset-0 bg-hyper-950 flex items-center justify-center overflow-hidden">
      {/* Glitchy grid background */}
      <div className="absolute inset-0 grid-bg opacity-30" />

      {/* Red gradient overlay for error state */}
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-hyper-accent/5" />

      {/* Main error content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-lg md:max-w-2xl mx-auto text-center">
        {/* Error icon - glitching square */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 mb-4">
          <div className="absolute inset-0 border-4 border-hyper-accent rotate-45 animate-glitch" />
          <div className="absolute inset-4 border-4 border-destructive/60 rotate-45 animate-pulse" />
          <div className="absolute inset-8 bg-hyper-accent/20 rotate-45" />
        </div>

        {/* Error code with glitch effect */}
        <div className="relative">
          <h1 className="text-5xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-destructive">
            ERROR
          </h1>
          {/* Glitch layers */}
          <div
            className="absolute inset-0 text-5xl md:text-8xl font-bold text-hyper-accent opacity-70 mix-blend-screen animate-glitch"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 45%, 0 45%)" }}
          >
            ERROR
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            Something went wrong
          </h2>
          <p className="text-hyper-400 font-mono text-sm md:text-base max-w-xs md:max-w-md mx-auto">
            {error.message ||
              "An unexpected error occurred while processing your request"}
          </p>
          {error.digest && (
            <p className="text-hyper-500 font-mono text-xs md:text-sm">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mt-4 w-full md:w-auto justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 md:px-8 md:py-3 bg-hyper-accent hover:bg-hyper-accentHover text-white font-semibold rounded-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,62,0,0.5)]"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 md:px-8 md:py-3 bg-hyper-800 hover:bg-hyper-700 text-white font-semibold rounded-sm transition-colors duration-200 border border-hyper-600"
          >
            Go Home
          </button>
        </div>

        {/* Decorative glitch lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-hyper-accent/50 to-transparent opacity-50" />
        <div className="absolute bottom-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-destructive/50 to-transparent opacity-50" />
      </div>

      {/* Animated corner accents */}
      <div className="absolute top-3 left-3 w-8 h-8 md:top-8 md:left-8 md:w-16 md:h-16 border-l-2 border-t-2 border-hyper-accent/30" />
      <div className="absolute top-3 right-3 w-8 h-8 md:top-8 md:right-8 md:w-16 md:h-16 border-r-2 border-t-2 border-hyper-accent/30" />
      <div className="absolute bottom-3 left-3 w-8 h-8 md:bottom-8 md:left-8 md:w-16 md:h-16 border-l-2 border-b-2 border-hyper-accent/30" />
      <div className="absolute bottom-3 right-3 w-8 h-8 md:bottom-8 md:right-8 md:w-16 md:h-16 border-r-2 border-b-2 border-hyper-accent/30" />
    </div>
  );
}
