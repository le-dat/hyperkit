"use client";

import { Cpu, Sparkles, Workflow, Zap } from "lucide-react";

const HERO_STATS = [
  {
    label: "Active Workflows",
    value: "10K+",
    icon: "Workflow",
  },
  {
    label: "Uptime SLA",
    value: "99.9%",
    icon: "Zap",
  },
  {
    label: "Avg Response",
    value: "<100ms",
    icon: "Cpu",
  },
  {
    label: "AI Models",
    value: "15+",
    icon: "Sparkles",
  },
] as const;

const iconMap = {
  Workflow,
  Zap,
  Cpu,
  Sparkles,
};

export function HeroStats() {
  return (
    <div className="mt-12 md:mt-20 pt-8 md:pt-12 border-t border-hyper-accent/20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        {HERO_STATS.map((stat, idx) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap];
          return (
            <div
              key={stat.label}
              className="group relative"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-hyper-accent">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-black font-mono text-white group-hover:text-hyper-accent transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-xs font-mono text-hyper-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </div>
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-hyper-accent/0 group-hover:bg-hyper-accent/5 rounded-lg transition-all -z-10"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
