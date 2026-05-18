"use client";

import { useState } from "react";
import {
  Sparkles,
  Wallet,
  MessageSquare,
  Code,
  Zap,
  TrendingUp,
  Users,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  onCategoryChange?: (category: string) => void;
}

const categories = [
  { id: "all", name: "All", icon: Sparkles, color: "hyper-accent" },
  { id: "defi", name: "DeFi", icon: Wallet, color: "emerald-500" },
  { id: "social", name: "Social", icon: MessageSquare, color: "blue-500" },
  { id: "devops", name: "DevOps", icon: Code, color: "purple-500" },
  {
    id: "productivity",
    name: "Productivity",
    icon: Zap,
    color: "yellow-500",
  },
  { id: "ai-model", name: "AI Model", icon: TrendingUp, color: "pink-500" },
  { id: "business", name: "Business", icon: Users, color: "orange-500" },
  { id: "featured", name: "Featured", icon: Star, color: "hyper-accent" },
];

export function CategoryFilter({ onCategoryChange }: CategoryFilterProps) {
  const [selected, setSelected] = useState("all");

  const handleSelect = (id: string) => {
    setSelected(id);
    onCategoryChange?.(id);
  };

  return (
    <div className="mb-6">
      {/* Category pills - simplified */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selected === category.id;

          return (
            <button
              key={category.id}
              onClick={() => handleSelect(category.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg font-mono text-xs transition-all",
                "border flex items-center gap-1.5",
                isSelected
                  ? "bg-hyper-accent border-hyper-accent text-white"
                  : "bg-hyper-900 border-hyper-700 text-hyper-400 hover:border-hyper-600 hover:text-white",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
