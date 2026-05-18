"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MarketplaceHeaderProps {
  onSearchChange?: (value: string) => void;
}

export function MarketplaceHeader({ onSearchChange }: MarketplaceHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter font-mono text-white mb-2">
            Discover{" "}
            <span className="bg-gradient-to-r from-hyper-accent to-orange-500 bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>
          <p className="text-sm text-hyper-400">Browse community workflows and MCP tools</p>
        </div>

        <div className="relative w-full max-w-full md:max-w-xs mt-4 md:mt-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hyper-500" />
          <Input
            type="text"
            placeholder="Search..."
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 bg-hyper-900 border-hyper-700 h-10 text-sm w-full"
          />
        </div>
      </div>
    </header>
  );
}
