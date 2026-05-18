"use client";

import { Server } from "lucide-react";

interface AddToolPromoBannerProps {
  totalTools: number;
  onAddTool?: () => void;
}

export function AddToolPromoBanner({
  totalTools,
  onAddTool,
}: AddToolPromoBannerProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-hyper-accent/20 via-hyper-900 to-hyper-950 border border-hyper-accent/30 p-3 md:p-6 group hover:border-hyper-accent/50 transition-all
      flex flex-col gap-8 md:flex-row md:items-center md:justify-between"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-linear-to-r from-hyper-accent/0 via-hyper-accent/10 to-hyper-accent/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      {/* Decorative orbs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-hyper-accent/20 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      {/* Left Content */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-xs font-bold text-emerald-500">
              New Feature
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-2 bg-clip-text">
            Add Your Own Tools
          </h2>
          <p className="text-sm text-hyper-300 leading-relaxed max-w-md">
            Connect custom MCP servers, private APIs, and self-hosted tools.
            Expand your capabilities beyond the marketplace.
          </p>
        </div>
      </div>

      {/* Right CTA */}
      <div className="flex flex-col items-end gap-3 mt-6 md:mt-0">
        <button
          onClick={onAddTool}
          className="group/btn px-6 py-3 flex items-center gap-3 rounded-xl bg-linear-to-r from-hyper-accent to-hyper-accentHover hover:shadow-2xl hover:shadow-hyper-accent/40 text-white font-bold transition-all hover:scale-105 active:scale-95"
        >
          <Server className="w-5 h-5 text-white group-hover/btn:rotate-12 transition-transform" />
          <span>Add Custom Tool</span>
          <svg
            className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        <p className="text-xs text-hyper-500 flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          SSE & Stdio supported
        </p>
      </div>
    </div>
  );
}
