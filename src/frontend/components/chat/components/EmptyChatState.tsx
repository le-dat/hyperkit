"use client";

import { ArrowRight, Newspaper, Repeat } from "lucide-react";

interface EmptyChatStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const SUGGESTIONS = [
  {
    label: "Swap Token",
    description: "Quickly exchange ERC-20 assets",
    suggestion: "Swap 1 ETH for USDC on Uniswap",
    icon: Repeat,
    color: "hyper-accent",
  },
  {
    label: "Get Market News",
    description: "Fetch the latest crypto headlines",
    suggestion: "Show me the latest DeFi market news",
    icon: Newspaper,
    color: "orange-500",
  },
];

export function EmptyChatState({ onSuggestionClick }: EmptyChatStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 md:p-8 text-center relative overflow-hidden">
      {/* Floating particles/shapes background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-hyper-accent/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl animate-float-delayed"></div>
      </div>

      <div className="relative z-10 space-y-6 md:space-y-8 animate-fade-in max-w-4xl">
        {/* Terminal-style status indicator */}
        <div className="inline-flex items-center gap-3 font-mono text-xs md:text-sm text-hyper-400 mb-2 glass px-4 py-2 rounded-full border border-white/10">
          <span className="animate-pulse text-hyper-accent">●</span>
          <span>SYSTEM READY</span>
        </div>

        {/* Main heading with gradient */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-mono leading-tight">
          <span className="text-white">HYPERKIT</span>{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-500 animate-gradient">
            AGENT
          </span>
        </h1>

        {/* Description */}
        <p className="text-hyper-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Your AI workflow architect. Connect tools, build automation pipelines,
          and handle complex logic.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {SUGGESTIONS.map(
            ({ label, description, suggestion, icon: Icon, color }, index) => (
              <button
                key={label}
                onClick={() => onSuggestionClick(suggestion)}
                className="group relative p-5 glass border border-white/10 rounded-xl hover:border-hyper-accent/50 hover:scale-105 hover:shadow-lg hover:shadow-hyper-accent/20 transition-all duration-300 text-left overflow-hidden animate-slide-up"
                style={{
                  animationDelay: `${index * 100 + 400}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-hyper-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Content */}
                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl bg-hyper-900/80 border border-${color}/30 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-${color}/60 transition-all duration-300`}
                  >
                    <Icon className={`w-5 h-5 text-${color}`} strokeWidth={2} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold text-white group-hover:text-hyper-accent transition-colors font-mono">
                        {label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-hyper-600 group-hover:text-hyper-accent group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <span className="block text-xs text-hyper-500 group-hover:text-hyper-400 transition-colors leading-relaxed">
                      {description}
                    </span>
                  </div>
                </div>
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
