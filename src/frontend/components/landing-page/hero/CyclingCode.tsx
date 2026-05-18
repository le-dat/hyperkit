"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const CODE_EXAMPLES = [
  {
    label: "Smart Contract Audit",
    code: `workflow:
  trigger: github.push
  steps:
    - analyze_solidity()
    - detect_vulnerabilities()
    - report_findings()`,
  },
  {
    label: "API Orchestration",
    code: `workflow:
  trigger: webhook
  steps:
    - fetch_data()
    - transform_payload()
    - sync_databases()`,
  },
  {
    label: "AI Data Pipeline",
    code: `workflow:
  trigger: schedule
  steps:
    - collect_metrics()
    - run_ml_model()
    - distribute_insights()`,
  },
] as const;

export function CyclingCode() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CODE_EXAMPLES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const current = CODE_EXAMPLES[currentIndex];

  return (
    <div className="relative">
      {/* Terminal window */}
      <div className="relative bg-black/40 backdrop-blur-xl border-2 border-hyper-accent/30 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-hyper-700/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="ml-auto text-xs font-mono text-hyper-400">
            {current.label}
          </span>
        </div>

        {/* Code block with transition */}
        <div className="relative h-48">
          {CODE_EXAMPLES.map((example, idx) => (
            <pre
              key={idx}
              className={cn(
                "absolute inset-0 font-mono text-sm leading-relaxed transition-all duration-700",
                idx === currentIndex
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none",
              )}
            >
              <code className="text-green-400">{example.code}</code>
            </pre>
          ))}
        </div>

        {/* Terminal prompt */}
        <div className="mt-4 flex items-center gap-2 text-sm font-mono">
          <span className="text-hyper-accent">❯</span>
          <span className="text-hyper-400">hyperkit deploy --production</span>
          <span className="animate-pulse text-green-400">✓</span>
        </div>

        {/* Holographic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-hyper-accent/5 via-transparent to-purple-500/5 pointer-events-none"></div>
      </div>

      {/* ASCII corner decorations */}
      <div className="absolute -top-3 -left-3 text-hyper-accent/30 font-mono text-xs leading-none">
        ╔═══
      </div>
      <div className="absolute -bottom-3 -right-3 text-hyper-accent/30 font-mono text-xs leading-none">
        ═══╝
      </div>
    </div>
  );
}
