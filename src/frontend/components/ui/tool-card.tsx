"use client";

import * as React from "react";
import {
  Download,
  Star,
  Shield,
  Box,
  Database,
  Zap,
  LucideIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ToolCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  description: string;
  author: string;
  downloads: string;
  stars: number;
  category: string;
  status?: "verified" | "community";
  icon?: "Box" | "Database" | "Zap";
  onClick?: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Database,
  Box,
};

// Real Unsplash images for tool categories
const categoryBackgrounds: Record<string, string> = {
  Crypto:
    "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80",
  Productivity:
    "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&q=80",
  "AI Model":
    "https://images.unsplash.com/photo-1677756119517-756a188d2d94?w=600&q=80",
};

function ToolCard({
  className,
  name,
  description,
  author,
  downloads,
  stars,
  category,
  status,
  icon = "Box",
  onClick,
  ...props
}: ToolCardProps) {
  const IconComponent = iconMap[icon] || Box;
  const backgroundImage =
    categoryBackgrounds[category] ||
    "https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=600&q=80";

  return (
    <div
      className={cn(
        "group cursor-pointer hover-lift animate-scroll-reveal",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {/* Glass card with background image */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-hyper-900/50 backdrop-blur-xl transition-all duration-300 group-hover:border-hyper-accent/50 group-hover:shadow-2xl group-hover:shadow-hyper-accent/10 flex flex-col h-full">
        {/* Background pattern/image */}
        <div className="relative h-32 overflow-hidden">
          <Image
            src={backgroundImage}
            alt={category}
            fill
            className="object-cover opacity-40 transition-transform duration-500 group-hover:scale-110"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-hyper-950/80 via-hyper-950/90 to-hyper-950"></div>

          {/* Status badge */}
          <div className="absolute top-3 right-3">
            {status === "verified" ? (
              <div className="glass-strong flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-green-500/30">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-[9px] font-mono font-bold text-green-400 uppercase tracking-wider">
                  Verified
                </span>
              </div>
            ) : (
              <div className="glass px-2.5 py-1 rounded-lg border border-white/10">
                <span className="text-[9px] font-mono font-bold text-hyper-400 uppercase tracking-wider">
                  Community
                </span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div className="absolute bottom-3 left-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-hyper-accent to-orange-600 flex items-center justify-center text-white shadow-lg shadow-hyper-accent/20 group-hover:scale-110 transition-transform duration-300">
              <IconComponent className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col space-y-3">
          {/* Title */}
          <h3 className="text-lg font-black text-white font-mono tracking-tight leading-tight group-hover:text-hyper-accent transition-colors">
            {name}
          </h3>

          {/* Author */}
          <p className="text-xs text-hyper-500 font-mono">by {author}</p>

          {/* Description */}
          <p className="text-hyper-300 text-sm leading-relaxed line-clamp-2 flex-1">
            {description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-white/70">
              <Download className="w-3 h-3" />
              <span className="font-semibold">{downloads}</span>
            </span>
            <span className="flex items-center gap-1.5 text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-semibold">{stars}</span>
            </span>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-white/5 bg-hyper-950/30 flex items-center justify-between">
          <span className="text-[10px] text-hyper-400 font-mono uppercase tracking-wider border border-hyper-700 px-2.5 py-1 rounded-lg">
            {category}
          </span>
          <button className="group/btn text-xs font-mono font-bold text-white bg-gradient-to-r from-hyper-accent to-orange-600 hover:from-hyper-accentHover hover:to-orange-700 px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-hyper-accent/20 hover:scale-105">
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-hyper-accent/0 via-hyper-accent/0 to-hyper-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    </div>
  );
}

export { ToolCard };
