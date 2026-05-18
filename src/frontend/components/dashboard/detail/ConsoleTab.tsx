import { CheckCircle2 } from "lucide-react";
import { Workflow } from "@/types";

interface ConsoleTabProps {
  workflow: Workflow;
}

export function ConsoleTab({ workflow }: ConsoleTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-black/50 rounded-xl p-4 border border-hyper-800 font-mono text-xs text-hyper-300">
        <div className="flex items-center gap-2 text-green-500 mb-2">
          <CheckCircle2 className="w-3 h-3" /> System Ready
        </div>
        <p className="opacity-50">Initializing agent environment...</p>
        <p className="opacity-50">Loading MCP tools: [GitHub, Gemini]...</p>
        <p className="text-white mt-2">Listening for trigger events...</p>
        {workflow.recentLogs && workflow.recentLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-hyper-800/50">
            <p className="text-hyper-500 mb-1">Last Output:</p>
            <p className="text-green-400">{workflow.recentLogs[0].output}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-hyper-900/30 rounded-xl border border-hyper-800">
        <h4 className="text-sm font-bold text-white mb-2">
          Agent Configuration
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="block text-hyper-500">Model</span>
            <span className="text-hyper-300">Gemini 2.5 Pro</span>
          </div>
          <div>
            <span className="block text-hyper-500">Memory</span>
            <span className="text-hyper-300">512MB (Shared)</span>
          </div>
          <div>
            <span className="block text-hyper-500">Timeout</span>
            <span className="text-hyper-300">30s</span>
          </div>
          <div>
            <span className="block text-hyper-500">Retries</span>
            <span className="text-hyper-300">3 max</span>
          </div>
        </div>
      </div>
    </div>
  );
}
