/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as LucideIcons from "lucide-react";
import { McpCatalogItem } from "@/service/mcpService";
import { cn } from "@/lib/utils";

interface McpServerItemProps {
  item: McpCatalogItem;
  isToggling: boolean;
  onToggle: (item: McpCatalogItem) => void;
  onConfigure: (item: McpCatalogItem) => void;
  onDeleteKey: (item: McpCatalogItem, e: React.MouseEvent) => void;
}

export function McpServerItem({
  item,
  isToggling,
  onToggle,
  onConfigure,
  onDeleteKey,
}: McpServerItemProps) {
  const DynamicIcon = (LucideIcons as any)[item.icon || "Zap"] || LucideIcons.Zap;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 bg-hyper-900/25 border-hyper-800/60 relative group hover:border-hyper-700/80 hover:bg-hyper-900/40",
        item.enabled && "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
          item.enabled ? "bg-emerald-500/15" : "bg-hyper-800/70"
        )}
      >
        <DynamicIcon className={cn("w-5 h-5", item.enabled ? "text-emerald-400" : "text-hyper-400")} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-white truncate">{item.label}</h3>
          <span className="text-[10px] text-hyper-400 px-2 py-0.5 rounded-full bg-hyper-800/80 font-medium">
            {item.category}
          </span>
          {item.configured && (
            <span className="text-[9px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 flex items-center gap-1 font-medium">
              <LucideIcons.Check className="w-2.5 h-2.5" /> Key Saved
            </span>
          )}
        </div>
        <p className="text-xs text-hyper-400 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {item.auth_type === "api_key" && item.configured && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfigure(item);
            }}
            className="p-1.5 rounded-lg border border-hyper-800 text-hyper-400 hover:text-white hover:bg-hyper-800 transition"
            title="Edit credentials"
          >
            <LucideIcons.Settings className="w-3.5 h-3.5" />
          </button>
        )}
        {item.auth_type === "api_key" && item.configured && (
          <button
            onClick={(e) => onDeleteKey(item, e)}
            className="p-1.5 rounded-lg border border-hyper-800 text-hyper-500 hover:text-rose-400 hover:bg-hyper-800 transition"
            title="Clear credentials"
          >
            <LucideIcons.Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Toggle Switch */}
        <button
          onClick={() => onToggle(item)}
          disabled={isToggling}
          className={cn(
            "w-10 h-6 rounded-full p-0.5 transition-colors relative duration-300 shrink-0",
            item.enabled ? "bg-emerald-500" : "bg-hyper-800"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300",
              item.enabled ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}
