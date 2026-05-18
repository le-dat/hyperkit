import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Workflow } from "@/types";

interface HistoryTabProps {
  workflow: Workflow;
}

export function HistoryTab({ workflow }: HistoryTabProps) {
  if (!workflow.recentLogs || workflow.recentLogs.length === 0) {
    return (
      <div className="text-center py-10 text-hyper-500">
        No execution history found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workflow.recentLogs.map((log) => (
        <div
          key={log.id}
          className="p-3 bg-hyper-900 border border-hyper-800 rounded-lg hover:border-hyper-600 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center border
                ${
                  log.status === "success"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }
              `}
            >
              {log.status === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{log.trigger}</p>
              <p className="text-xs text-hyper-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />{" "}
                {log.startTime.toLocaleTimeString()} • {log.duration}
              </p>
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-xs text-hyper-400 hover:text-white underline">
              View Logs
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
