import { Play, Edit, X, Loader2 } from "lucide-react";
import { Workflow } from "@/types";

interface AgentHeaderProps {
  workflow: Workflow;
  isRunning: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRun: (id: string) => void;
}

export function AgentHeader({
  workflow,
  isRunning,
  onClose,
  onEdit,
  onRun,
}: AgentHeaderProps) {
  return (
    <div className="h-20 border-b border-hyper-800 flex items-center justify-between px-6 bg-hyper-900 shrink-0">
      <div>
        <h2 className="text-xl font-bold text-white">{workflow.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`w-2 h-2 rounded-full ${
              workflow.status === "active" ? "bg-green-500" : "bg-gray-500"
            }`}
          ></span>
          <span className="text-xs text-hyper-400 font-mono uppercase">
            {workflow.status}
          </span>
          <span className="text-hyper-600 px-1">•</span>
          <span className="text-xs text-hyper-400">{workflow.runningOn}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onRun(workflow.id)}
          disabled={isRunning}
          className="p-2 bg-hyper-800 hover:bg-green-500/10 text-hyper-300 hover:text-green-500 rounded-lg border border-hyper-700 transition-colors"
          title="Run Build"
        >
          {isRunning ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={() => onEdit(workflow.id)}
          className="p-2 bg-hyper-800 hover:bg-hyper-700 text-hyper-300 hover:text-white rounded-lg border border-hyper-700 transition-colors"
          title="Edit in Canvas"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2 hover:bg-hyper-800 rounded-lg text-hyper-400 hover:text-white ml-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
