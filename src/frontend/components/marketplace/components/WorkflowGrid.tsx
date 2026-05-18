"use client";

import { MarketplaceItem } from "@/types";
import { User, Download, Star, ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";

interface WorkflowGridProps {
  workflows: MarketplaceItem[];
  onSelectWorkflow: (workflow: MarketplaceItem) => void;
}

// Real Unsplash images for different workflow categories
const categoryImages: Record<string, string> = {
  DeFi: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80",
  Social:
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
  DevOps:
    "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80",
  Business:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  Productivity:
    "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80",
  "AI Model":
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
};

export function WorkflowGrid({
  workflows,
  onSelectWorkflow,
}: WorkflowGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {workflows.map((item, index) => {
        const imageUrl =
          categoryImages[item.category] ||
          "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&q=80";

        return (
          <div
            key={item.id}
            onClick={() => onSelectWorkflow(item)}
            className="group cursor-pointer animate-scroll-reveal hover-lift"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Glass card with image */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-hyper-900/50 backdrop-blur-xl transition-all duration-300 group-hover:border-hyper-accent/50 group-hover:shadow-2xl group-hover:shadow-hyper-accent/10">
              {/* Hero image with overlay */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-hyper-950 via-hyper-950/60 to-transparent"></div>

                {/* Category badge */}
                <div className="absolute top-4 right-4">
                  <span className="glass-strong px-3 py-1.5 rounded-lg text-[10px] text-white font-mono font-bold border border-white/20 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>

                {/* Verified badge for popular items */}
                {item.stars > 200 && (
                  <div className="absolute top-4 left-4 glass-strong px-2 py-1 rounded-lg border border-hyper-accent/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-hyper-accent" />
                    <span className="text-[9px] text-hyper-accent font-mono font-bold uppercase">
                      Popular
                    </span>
                  </div>
                )}

                {/* Bottom stats overlay */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-white/80">
                      <Download className="w-3 h-3" /> {item.downloads}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3 h-3 fill-current" /> {item.stars}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content section */}
              <div className="p-5 space-y-3">
                {/* Author */}
                <div className="flex items-center gap-2 text-xs text-hyper-400 font-mono">
                  <User className="w-3 h-3" />
                  <span>{item.author}</span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-black text-white font-mono tracking-tight leading-tight group-hover:text-hyper-accent transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-hyper-300 text-sm leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* CTA */}
                <div className="pt-3 flex items-center text-hyper-500 text-xs font-mono font-semibold group-hover:text-hyper-accent transition-colors">
                  <span>Configure & Install</span>
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-hyper-accent/0 via-hyper-accent/0 to-hyper-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
