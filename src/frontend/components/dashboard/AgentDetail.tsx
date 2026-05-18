"use client";

import { useState } from "react";
import { Terminal, History, Settings } from "lucide-react";
import { Workflow } from "@/types";
import { AgentHeader } from "./detail/AgentHeader";
import { ConsoleTab } from "./detail/ConsoleTab";
import { HistoryTab } from "./detail/HistoryTab";
import { ConfigTab } from "./detail/ConfigTab";

interface AgentDetailProps {
  workflow: Workflow | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRun: (id: string) => void;
}

export function AgentDetail({
  workflow,
  onClose,
  onEdit,
  onRun,
}: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<"console" | "history" | "config">(
    "console",
  );
  const [isRunning, setIsRunning] = useState(false);

  if (!workflow) return null;

  const handleRun = () => {
    setIsRunning(true);
    onRun(workflow.id);
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-hyper-950 border-l border-hyper-800 shadow-2xl flex flex-col animate-slide-in-right z-[110]"
    >
      <AgentHeader
        workflow={workflow}
        isRunning={isRunning}
        onClose={onClose}
        onEdit={onEdit}
        onRun={handleRun}
      />

      <div className="flex border-b border-hyper-800 bg-hyper-950 shrink-0">
        <button
          onClick={() => setActiveTab("console")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === "console"
              ? "border-hyper-accent text-white"
              : "border-transparent text-hyper-500 hover:text-hyper-300"
          }`}
        >
          <Terminal className="w-4 h-4" /> Console
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === "history"
              ? "border-hyper-accent text-white"
              : "border-transparent text-hyper-500 hover:text-hyper-300"
          }`}
        >
          <History className="w-4 h-4" /> History
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
            activeTab === "config"
              ? "border-hyper-accent text-white"
              : "border-transparent text-hyper-500 hover:text-hyper-300"
          }`}
        >
          <Settings className="w-4 h-4" /> Config
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black/20 p-6">
        {activeTab === "console" && <ConsoleTab workflow={workflow} />}
        {activeTab === "history" && <HistoryTab workflow={workflow} />}
        {activeTab === "config" && <ConfigTab />}
      </div>
    </div>
  );
}
