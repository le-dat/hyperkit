import * as React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  variant?: "default" | "accent" | "gradient";
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  badge?: string;
}

function StatsCard({
  className,
  label,
  value,
  icon: Icon,
  iconColor,
  variant = "default",
  trend,
  subtitle,
  badge,
  ...props
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl border flex flex-col transition-all",
        {
          "bg-hyper-900 border-hyper-800 hover:border-hyper-700":
            variant === "default",
          "bg-gradient-to-br from-hyper-accent to-orange-600 border-hyper-accent/50":
            variant === "accent",
          "bg-gradient-to-br from-purple-600 to-blue-600 border-purple-500/50":
            variant === "gradient",
        },
        className,
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p
          className={cn(
            "text-[10px] font-mono font-bold uppercase tracking-wider",
            {
              "text-hyper-500": variant === "default",
              "text-white/80": variant === "accent" || variant === "gradient",
            },
          )}
        >
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn("w-4 h-4", {
              "text-hyper-600": variant === "default" && !iconColor,
              "text-white/60": variant === "accent" || variant === "gradient",
            })}
            style={
              iconColor && variant === "default"
                ? { color: iconColor }
                : undefined
            }
          />
        )}
      </div>

      {/* Value */}
      <p
        className={cn("text-2xl font-black font-mono tracking-tight mb-1", {
          "text-white": true,
        })}
      >
        {value}
      </p>

      {/* Trend or Subtitle */}
      {trend && (
        <div className="flex items-center gap-1">
          {trend.isPositive ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span
            className={cn("text-[10px] font-mono font-semibold", {
              "text-green-400": trend.isPositive,
              "text-red-400": !trend.isPositive,
            })}
          >
            {trend.value}
          </span>
        </div>
      )}
      {subtitle && !trend && (
        <p
          className={cn("text-[10px] font-mono", {
            "text-hyper-500": variant === "default",
            "text-white/50": variant === "accent" || variant === "gradient",
          })}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export { StatsCard };
