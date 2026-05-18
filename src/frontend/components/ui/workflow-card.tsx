import { cn } from "@/lib/utils";
import { Workflow } from "@/types";
import { Activity, ExternalLink } from "lucide-react";
import * as React from "react";

interface WorkflowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  workflow: Workflow;
  onClick?: () => void;
}

function WorkflowCard({
  className,
  workflow,
  onClick,
  ...props
}: WorkflowCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-hyper-900 border border-hyper-800 hover:border-hyper-700 rounded-xl overflow-hidden flex flex-col cursor-pointer transition-all",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {/* Status Bar */}
      <div
        className={cn("h-1", {
          "bg-green-500": workflow.status === "active",
          "bg-hyper-800": workflow.status !== "active",
        })}
      />

      <div className="p-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black font-mono text-white line-clamp-1 mb-1">
              {workflow.name}
            </h3>
            <span className="text-[9px] text-hyper-500 font-mono uppercase">
              {workflow.source}
            </span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-black font-mono text-white">
              {workflow.cost}
            </div>
            <div className="text-[8px] text-hyper-600 font-mono">/day</div>
          </div>
        </div>

        {/* Output */}
        {workflow.recentLogs?.[0]?.output ? (
          <div className="bg-hyper-950 p-3 rounded-lg border border-hyper-800">
            <div className="flex items-start gap-2 font-mono text-xs text-hyper-300">
              <span
                className={cn("shrink-0", {
                  "text-green-500": workflow.status === "active",
                  "text-hyper-600": workflow.status !== "active",
                })}
              >
                &gt;
              </span>
              <span className="flex-1 break-words">
                {workflow.recentLogs[0].output}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-hyper-950/50 p-3 rounded-lg border border-hyper-800/50 border-dashed">
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <Activity className="w-4 h-4 text-hyper-600 mb-2" />
              <p className="text-[10px] text-hyper-500 font-mono">
                No output yet
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-hyper-800 bg-hyper-950/50 flex items-center justify-between">
        <span className="text-[10px] text-hyper-600 font-mono">
          {workflow.lastRun || "Never"}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-hyper-accent text-[10px] font-mono font-bold flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            View
          </div>
        </div>
      </div>
    </div>
  );
}

export { WorkflowCard };
