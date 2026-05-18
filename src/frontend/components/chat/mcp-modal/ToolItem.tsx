import { Check, Loader2, Zap, AlertCircle, Activity } from "lucide-react";
import { useState } from "react";
import { MCPTool, MCPToolStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ToolItemProps {
  tool: MCPTool;
  onConnect: (toolId: string) => void;
}

// Helper to normalize categories to array
const getCategories = (category?: string | string[]): string[] => {
  if (!category) return [];
  return Array.isArray(category) ? category : [category];
};

const STATUS_CONFIG = {
  connected: {
    label: "Connected",
    icon: Activity,
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-500",
    borderColor: "border-emerald-500/30",
    dotColor: "bg-emerald-500",
    cardBorder: "border-emerald-500/20",
    cardGlow: "shadow-emerald-500/10",
  },
  connecting: {
    label: "Connecting",
    icon: Loader2,
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-500",
    borderColor: "border-amber-500/30",
    dotColor: "bg-amber-500",
    cardBorder: "border-amber-500/20",
    cardGlow: "shadow-amber-500/10",
  },
  disconnected: {
    label: "Disconnected",
    icon: Zap,
    bgColor: "bg-slate-700/20",
    textColor: "text-slate-400",
    borderColor: "border-slate-600/30",
    dotColor: "bg-slate-500",
    cardBorder: "border-slate-700/40",
    cardGlow: "shadow-slate-800/20",
  },
  error: {
    label: "Connection Failed",
    icon: AlertCircle,
    bgColor: "bg-red-500/10",
    textColor: "text-red-500",
    borderColor: "border-red-500/30",
    dotColor: "bg-red-500",
    cardBorder: "border-red-500/20",
    cardGlow: "shadow-red-500/10",
  },
} as const;

export function ToolItem({ tool, onConnect }: ToolItemProps) {
  const [status, setStatus] = useState<MCPToolStatus>(
    tool.installed ? "connected" : "disconnected",
  );

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const handleConnect = async () => {
    if (status !== "disconnected" && status !== "error") return;
    setStatus("connecting");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStatus("connected");
      onConnect(tool.id);
    } catch {
      setStatus("error");
    }
  };

  const handleDisconnect = async () => {
    if (status !== "connected") return;
    setStatus("connecting");
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatus("disconnected");
    } catch {
      setStatus("connected");
    }
  };

  const isActive = status === "connected";
  const isInteractive = status === "disconnected" || status === "error";
  const categories = getCategories(tool.category);
  const hasImage = !!tool.image;

  return (
    <div
      className={cn(
        "group relative flex flex-col h-full min-h-[240px] rounded-2xl transition-all duration-500 overflow-hidden",
        "bg-gradient-to-br from-hyper-950/90 via-hyper-900/80 to-hyper-950/70",
        "border-2 backdrop-blur-md",
        config.cardBorder,
        isActive && "opacity-95",
        isInteractive && "hover:scale-[1.02] hover:shadow-2xl cursor-pointer",
        isInteractive && config.cardGlow,
      )}
      onClick={isInteractive ? handleConnect : undefined}
    >
      {/* Background gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500",
          "bg-gradient-to-br from-white/5 via-transparent to-transparent",
          isInteractive && "group-hover:opacity-100",
        )}
      />

      {/* Card content */}
      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Status badge - Top right */}
        <div className="flex items-start justify-end mb-3">
          <div
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              "border backdrop-blur-sm transition-all duration-300",
              config.bgColor,
              config.textColor,
              config.borderColor,
              "flex items-center gap-1.5",
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              {status === "connected" && (
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
                  style={{ backgroundColor: "currentColor" }}
                />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-1.5 w-1.5",
                  config.dotColor,
                )}
              />
            </span>
            {config.label}
          </div>
        </div>

        {/* Header with icon and title */}
        <div className="flex items-start gap-3 mb-3">
          {/* Tool logo or status icon */}
          {hasImage ? (
            <div
              className={cn(
                "shrink-0 w-11 h-11 rounded-xl overflow-hidden transition-all duration-300",
                "bg-white/5 border border-slate-700/50",
                isInteractive &&
                  "group-hover:scale-110 group-hover:border-slate-600/70",
              )}
            >
              <div className="relative w-full h-full">
                <Image
                  src={tool.image || ""}
                  alt={tool.name}
                  fill
                  className="object-contain p-1.5"
                  unoptimized
                />
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
                config.bgColor,
                isInteractive && "group-hover:scale-110 group-hover:rotate-3",
              )}
            >
              <StatusIcon
                className={cn(
                  "w-5 h-5",
                  config.textColor,
                  status === "connecting" && "animate-spin",
                )}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-bold text-base mb-1 line-clamp-2 transition-colors duration-300",
                isActive
                  ? "text-white/90"
                  : "text-white group-hover:text-white",
              )}
            >
              {tool.name}
            </h3>

            {/* Categories - support multiple */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {categories.map((cat, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span className="text-[10px] text-slate-500">{cat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          className={cn(
            "text-xs leading-relaxed mb-4 flex-1 line-clamp-3 transition-colors duration-300",
            isActive
              ? "text-slate-400"
              : "text-slate-300 group-hover:text-slate-200",
          )}
        >
          {tool.description}
        </p>

        {/* Action button */}
        <div className="mt-auto">
          {status === "disconnected" && (
            <Button
              onClick={handleConnect}
              className={cn(
                "w-full h-11 text-sm font-bold transition-all duration-300",
                "bg-gradient-to-r from-white to-slate-100 text-black",
                "hover:from-slate-100 hover:to-white hover:shadow-xl hover:shadow-white/20",
                "transform active:scale-[0.98]",
                "border-0 relative overflow-hidden group/btn",
              )}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
              <Zap className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10">Connect Tool</span>
            </Button>
          )}

          {status === "error" && (
            <Button
              onClick={handleConnect}
              className={cn(
                "w-full h-11 text-sm font-bold transition-all duration-300",
                "bg-red-500/10 text-red-400 border-2 border-red-500/30",
                "hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300",
                "transform active:scale-[0.98]",
              )}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          )}

          {status === "connecting" && (
            <Button
              disabled
              className={cn(
                "w-full h-11 text-sm font-medium",
                "bg-amber-500/10 text-amber-400 border-2 border-amber-500/30",
                "cursor-not-allowed",
              )}
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </Button>
          )}

          {status === "connected" && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnect();
              }}
              variant="outline"
              className={cn(
                "w-full h-9 text-xs font-medium transition-all duration-300",
                "border-2 border-emerald-500/20 bg-emerald-500/5",
                "text-emerald-400 hover:text-emerald-300",
                "hover:border-emerald-500/40 hover:bg-emerald-500/10",
              )}
            >
              <Check className="w-3.5 h-3.5 mr-1.5 stroke-[3px]" />
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {/* Decorative corner gradient */}
      {isInteractive && (
        <div
          className={cn(
            "absolute -top-12 -right-12 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700",
            "bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-full blur-2xl",
            "pointer-events-none",
          )}
        />
      )}
    </div>
  );
}
