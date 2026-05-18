"use client";

import { cn } from "@/lib/utils";
import {
  Code,
  Zap,
  Database,
  Network,
  Terminal,
  Globe,
  Clock,
  Check,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

/**
 * Sub-components for visuals and content reuse
 */

function FeatureCard({
  title,
  description,
  graphic,
  wide = false,
  children,
  className,
}: {
  title: string;
  description: string;
  graphic: React.ReactNode;
  wide?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-hyper-900 p-1 overflow-hidden hover:border-white/20 transition-all duration-300",
        className,
        wide && "lg:col-span-2",
      )}
    >
      {/* Overlay highlight on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      {/* Visual section */}
      {graphic}
      {/* Content */}
      <div
        className={cn(
          "p-5",
          children
            ? "flex flex-col md:flex-row md:items-end justify-between gap-4"
            : undefined,
        )}
      >
        <div className="max-w-md">
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-base text-gray-500 leading-relaxed">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function GridPaymentVisual() {
  // Abstract Payment Grid
  const IconGrid = [
    {
      icon: <Code className="w-5 h-5 text-gray-400" />,
      key: "code",
      color: "bg-gray-800",
    },
    {
      icon: (
        <>
          <Zap className="w-5 h-5 text-white" />
          <div className="absolute -inset-1 rounded-lg bg-hyper-accent/20 blur-sm"></div>
        </>
      ),
      key: "zap",
      color: "bg-hyper-accent relative shadow-[0_0_15px_rgba(255,62,0,0.4)]",
    },
    {
      icon: <Database className="w-5 h-5 text-gray-400" />,
      key: "database",
      color: "bg-gray-800",
    },
    {
      icon: <Network className="w-5 h-5 text-gray-400" />,
      key: "network",
      color: "bg-gray-800",
    },
    {
      icon: <Terminal className="w-5 h-5 text-gray-400" />,
      key: "terminal",
      color: "bg-gray-800",
    },
    {
      icon: <Globe className="w-5 h-5 text-gray-400" />,
      key: "globe",
      color: "bg-gray-800",
    },
  ];
  return (
    <div
      className={cn(
        "h-64 bg-hyper-950 rounded-xl mb-1 relative overflow-hidden flex items-center justify-center border border-white/5",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-hyper-950 to-hyper-950"></div>
      <div className="grid grid-cols-3 gap-3 relative z-10 opacity-60 group-hover:opacity-100 transition-opacity">
        {IconGrid.map((item, idx) => (
          <div
            key={item.key}
            className={`w-12 h-12 rounded-lg ${item.color} border border-white/10 flex items-center justify-center`}
          >
            {item.icon}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulingVisual() {
  // Orbiting Nodes Graphics, lines, etc.
  return (
    <div
      className={cn(
        "h-64 bg-hyper-950 rounded-xl mb-1 relative overflow-hidden flex items-center justify-center border border-white/5",
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-md h-full relative px-8">
          {/* Center Node */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-16 h-16 rounded-full border border-hyper-accent/30 bg-hyper-900 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,62,0,0.2)]">
              <Clock className="w-6 h-6 text-hyper-accent" />
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="#ff3e00"
                  strokeWidth="2"
                  strokeDasharray="301"
                  strokeDashoffset="100"
                  className="opacity-50"
                ></circle>
              </svg>
            </div>
          </div>
          {/* Orbiting Nodes */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center z-10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
          </div>
          <div className="absolute top-1/4 right-1/4 w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center z-10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
          </div>
          <div className="absolute bottom-1/4 right-1/3 w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center z-10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500"></div>
          </div>
          {/* Connecting Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none stroke-white/10"
            style={{ strokeDasharray: "4 4" }}
          >
            <line x1="25%" y1="50%" x2="50%" y2="50%"></line>
            <line x1="75%" y1="25%" x2="50%" y2="50%"></line>
            <line x1="66%" y1="75%" x2="50%" y2="50%"></line>
          </svg>
        </div>
      </div>
    </div>
  );
}

function ExecutionVisual() {
  // Simulated chat UX
  return (
    <div
      className={cn(
        "h-64 bg-hyper-950 rounded-xl mb-1 relative overflow-hidden flex flex-col items-center justify-center border border-white/5 px-6",
      )}
    >
      <div className="w-full space-y-3">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
            U
          </div>
          <div className="bg-gray-800/80 p-3 rounded-2xl rounded-tl-none text-xs text-gray-300 border border-white/5">
            Execute workflow now?
          </div>
        </div>
        <div className="flex gap-3 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-hyper-accent flex items-center justify-center text-xs text-white font-bold">
            AI
          </div>
          <div className="bg-hyper-accent/20 p-3 rounded-2xl rounded-tr-none text-xs text-orange-200 border border-hyper-accent/20">
            <span className="flex items-center gap-2">
              <Check className="w-3 h-3" /> Execution complete.
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700"></div>
          <div className="bg-gray-800/80 p-3 rounded-2xl rounded-tl-none text-xs text-gray-300 border border-white/5 w-24 h-8 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  // Minimal chart
  return (
    <div
      className={cn(
        "h-64 bg-hyper-950 rounded-xl mb-1 relative overflow-hidden flex items-end border border-white/5 group-hover:bg-hyper-900/80 transition-colors",
      )}
    >
      <div className="w-full h-full p-8 flex items-end gap-2 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Floating Info Cards */}
        <div className="absolute top-8 left-8 bg-hyper-900 border border-white/10 p-3 rounded-lg shadow-xl z-10 flex gap-3 items-center">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="text-xs text-gray-300">Alert: High CPU Usage</div>
        </div>
        <div className="absolute top-20 right-12 bg-hyper-900 border border-hyper-accent/30 p-3 rounded-lg shadow-xl z-10 flex gap-3 items-center">
          <div className="w-2 h-2 rounded-full bg-hyper-accent animate-ping"></div>
          <div className="text-xs text-hyper-accent">Live: 1.2k req/s</div>
        </div>
        {/* Chart Bars */}
        <div className="flex-1 bg-gray-800/20 h-1/3 rounded-t-sm"></div>
        <div className="flex-1 bg-gray-800/30 h-1/2 rounded-t-sm"></div>
        <div className="flex-1 bg-gray-800/40 h-2/5 rounded-t-sm"></div>
        <div className="flex-1 bg-orange-900/30 h-3/4 rounded-t-sm border-t border-hyper-accent/50 relative">
          <div className="absolute -top-1 left-0 w-full h-[1px] bg-hyper-accent shadow-[0_0_10px_#ff3e00]"></div>
        </div>
        <div className="flex-1 bg-gray-800/20 h-2/3 rounded-t-sm"></div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    delay: 100,
    wide: false,
    title: "Supports Any Integration",
    description:
      "Connect effortlessly with any API, database, or service to keep your workflows running smoothly across platforms.",
    graphic: <GridPaymentVisual />,
  },
  {
    delay: 200,
    wide: true,
    title: "Automated Workflow Scheduling",
    description:
      "Schedule workflows in advance and automate recurring tasks to stay organized and never miss a deadline.",
    graphic: <SchedulingVisual />,
    children: (
      <div className="px-3 py-1 bg-hyper-accent/10 border border-hyper-accent/20 rounded-full text-hyper-accent text-xs font-medium uppercase tracking-wider self-start md:self-center">
        Auto-Sync
      </div>
    ),
  },
  {
    delay: 300,
    wide: false,
    title: "Execute Without Limits",
    description:
      "Run workflows anytime, anywhere, without restrictions or bottlenecks.",
    graphic: <ExecutionVisual />,
  },
  {
    delay: 400,
    wide: true,
    title: "Real-Time Performance Tracking",
    description:
      "Monitor every execution as it happens, giving you instant clarity and full control over your automation performance.",
    graphic: <AnalyticsVisual />,
  },
];

function SectionHeader() {
  return (
    <ScrollReveal>
      <div className={cn("text-center mb-16")}>
        <div
          className={cn(
            "inline-block px-4 py-2 rounded-full bg-hyper-900/30 border border-hyper-800 text-sm font-medium text-hyper-400 mb-4",
          )}
        >
          Powerful Features
        </div>
        <h2 className={cn("text-4xl md:text-5xl font-bold text-white mb-4")}>
          Workflow automation for{" "}
          <span
            className={cn(
              "text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-500",
            )}
          >
            the modern business
          </span>
        </h2>
        <p className={cn("text-hyper-400 text-lg max-w-2xl mx-auto")}>
          Tailored automation tools designed to simplify management, boost
          efficiency, and support your business&apos;s growth in today&apos;s
          fast-paced world.
        </p>
      </div>
    </ScrollReveal>
  );
}

export function FinanceModernSection() {
  const line1 = FEATURES.slice(0, 2);
  const line2 = FEATURES.slice(2, 4);
  return (
    <div className={cn("py-32 relative ")} id="finance">
      <div className={cn("max-w-7xl mx-auto px-4")}>
        <SectionHeader />
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6")}>
          {line1.map((feature) => (
            <ScrollReveal key={feature.title} delay={feature.delay}>
              <FeatureCard
                title={feature.title}
                description={feature.description}
                graphic={feature.graphic}
                wide={feature.wide}
              >
                {feature.children}
              </FeatureCard>
            </ScrollReveal>
          ))}
        </div>
        <div
          className={cn("grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 mt-6")}
        >
          {line2.map((feature) => (
            <ScrollReveal key={feature.title} delay={feature.delay}>
              <FeatureCard
                title={feature.title}
                description={feature.description}
                graphic={feature.graphic}
                wide={feature.wide}
              >
                {feature.children}
              </FeatureCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
