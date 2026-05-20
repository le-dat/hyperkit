import React, { useState } from "react";
import { Loader2, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { ThinkingStep } from "@/types";

interface AgentThinkingProcessProps {
  steps?: ThinkingStep[];
}

export function AgentThinkingProcess({ steps }: AgentThinkingProcessProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (!steps || steps.length === 0) return null;

  const activeStepsCount = steps.length;
  const runningStep = steps.find((s) => !s.isCompleted);

  return (
    <div className="mb-4 rounded-xl border border-hyper-800 bg-hyper-900/30 overflow-hidden text-xs max-w-2xl">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-hyper-800/10 text-hyper-400 hover:text-hyper-200 transition-colors"
      >
        {runningStep ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-hyper-accent shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
        )}
        <span className="font-mono font-semibold flex-1 text-left select-none">
          {runningStep ? `Agent thinking... (${runningStep.tool})` : "Agent finished thinking"}
        </span>
        <span className="text-[10px] bg-hyper-800/60 px-2 py-0.5 rounded-full text-hyper-300">
          {activeStepsCount} steps
        </span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
      </button>

      {/* Steps List */}
      {isOpen && (
        <div className="border-t border-hyper-800/50 p-3 space-y-3 bg-hyper-950/20 font-mono">
          {steps.map((step) => (
            <div key={step.id} className="flex gap-2.5 items-start">
              {step.isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-4 h-4 text-hyper-accent animate-spin shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-hyper-200">{step.status}</div>
                {step.input && (
                  <pre className="mt-1.5 text-[10px] bg-hyper-900 px-2.5 py-2 rounded-lg text-hyper-400 overflow-x-auto max-h-32 border border-hyper-800/40">
                    Input:{" "}
                    {typeof step.input === "string"
                      ? step.input
                      : JSON.stringify(step.input, null, 2)}
                  </pre>
                )}
                {step.output && (
                  <pre className="mt-1.5 text-[10px] bg-hyper-900 px-2.5 py-2 rounded-lg text-green-400/90 overflow-x-auto max-h-32 border border-hyper-800/40">
                    Output:{" "}
                    {typeof step.output === "string"
                      ? step.output
                      : JSON.stringify(step.output, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
