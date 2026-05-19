import { useState } from "react";
import { Check, Loader2, Zap } from "lucide-react";
import { MCPTool, MCPToolStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mcpService } from "@/service/mcpService";

interface ToolItemProps {
  tool: MCPTool;
  onConnect: (toolId: string) => void;
}

export function ToolItem({ tool, onConnect }: ToolItemProps) {
  const [status, setStatus] = useState<MCPToolStatus>(
    tool.installed ? "connected" : "disconnected",
  );

  const handleConnect = async () => {
    if (status !== "disconnected") return;
    setStatus("connecting");
    try {
      const response = await mcpService.connect(tool.id);
      if (response?.success) {
        setStatus("connected");
        onConnect(tool.id);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleDisconnect = async () => {
    if (status !== "connected") return;
    setStatus("disconnected");
    await mcpService.disconnect(tool.id);
  };

  const category = Array.isArray(tool.category) ? tool.category[0] : tool.category;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        "bg-hyper-900/50 border-hyper-800",
        status === "connected" && "border-emerald-500/30 bg-emerald-500/5",
        status === "disconnected" && "hover:bg-hyper-900 hover:border-hyper-700 cursor-pointer",
      )}
      onClick={status === "disconnected" ? handleConnect : undefined}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          status === "connected" ? "bg-emerald-500/20" : "bg-hyper-800",
        )}
      >
        <Zap className={cn("w-4 h-4", status === "connected" ? "text-emerald-400" : "text-hyper-400")} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-white truncate">{tool.name}</h3>
          {category && (
            <span className="text-[10px] text-hyper-500 px-1.5 py-0.5 rounded bg-hyper-800">
              {category}
            </span>
          )}
        </div>
        <p className="text-xs text-hyper-500 line-clamp-2 mt-0.5">{tool.description}</p>
      </div>

      <div className="shrink-0">
        {status === "disconnected" && (
          <Button
            onClick={handleConnect}
            size="sm"
            className="h-7 text-xs font-medium bg-white text-black hover:bg-slate-100"
          >
            Connect
          </Button>
        )}
        {status === "connecting" && (
          <Button disabled size="sm" className="h-7 text-xs">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ...
          </Button>
        )}
        {status === "connected" && (
          <Button
            onClick={handleDisconnect}
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
          >
            <Check className="w-3 h-3 mr-1" />
            Connected
          </Button>
        )}
      </div>
    </div>
  );
}