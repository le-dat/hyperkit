"use client";

import { PATH } from "@/lib/constants";
import { Workflow } from "@/types";
import { Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatsGrid } from "./components/StatsGrid";
import { WorkflowGrid } from "./components/WorkflowGrid";
import { FloatingDock } from "./components/FloatingDock";
import { ViewToggle } from "./components/ViewToggle";

interface DashboardProps {
  workflows?: Workflow[];
  onSelectWorkflow?: (workflow: Workflow) => void;
  onOpenCreate?: () => void;
  onOpenMarketplace?: () => void;
  onOpenSettings?: () => void;
}

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    name: "ETH Price Monitor",
    description: "Monitors ETH price and sends alerts when price changes exceed 5%",
    status: "active",
    source: "created",
    createdAt: new Date(),
    runningOn: "Cloud",
    cost: "$0.02",
    lastRun: "2 min ago",
    nodes: [],
    edges: [],
    recentLogs: [
      {
        id: "1",
        status: "success",
        startTime: new Date(),
        duration: "1.2s",
        trigger: "Schedule",
        output: "ETH: $2,450 (+2.3%)",
      },
    ],
  },
  {
    id: "2",
    name: "Twitter Sentiment Bot",
    description: "Analyzes Twitter sentiment for crypto tokens and posts summaries",
    status: "active",
    source: "installed",
    createdAt: new Date(),
    runningOn: "Edge",
    cost: "$0.15",
    lastRun: "15 min ago",
    nodes: [],
    edges: [],
  },
  {
    id: "3",
    name: "DeFi Arbitrage Scanner",
    description: "Scans Uniswap and SushiSwap for arbitrage opportunities",
    status: "inactive",
    source: "created",
    createdAt: new Date(),
    runningOn: "Cloud",
    cost: "$0.05",
    lastRun: "1 hour ago",
    nodes: [],
    edges: [],
  },
];

export function Dashboard({
  workflows = mockWorkflows,
  onSelectWorkflow,
  onOpenCreate,
  onOpenMarketplace,
  onOpenSettings,
}: DashboardProps) {
  const router = useRouter();

  const handleSelectWorkflow = (workflow: Workflow) => {
    if (onSelectWorkflow) {
      onSelectWorkflow(workflow);
    } else {
      // Navigate to workflow detail or agent page
      router.push(`${PATH.agent}?id=${workflow.id}`);
    }
  };

  const handleOpenMarketplace = () => {
    if (onOpenMarketplace) {
      onOpenMarketplace();
    } else {
      router.push(PATH.marketplace);
    }
  };

  const handleOpenCreate = () => {
    if (onOpenCreate) {
      onOpenCreate();
    } else {
      router.push(PATH.agent);
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-hyper-950">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Compact Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter font-mono text-white">
              Your{" "}
              <span className="bg-gradient-to-r from-hyper-accent to-orange-500 bg-clip-text text-transparent">
                AI Agents
              </span>
            </h1>
          </div>

          <StatsGrid workflows={workflows} />

          {/* List Header */}
          <div className="flex items-center justify-between mb-4 mt-8">
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-hyper-accent" />
              Running Workflows
            </h2>
          </div>

          <WorkflowGrid workflows={workflows} onSelectWorkflow={handleSelectWorkflow} />

          {/* Bottom padding for FloatingDock */}
          <div className="h-24"></div>
        </div>
      </div>

      <FloatingDock
        onOpenMarketplace={handleOpenMarketplace}
        onOpenCreate={handleOpenCreate}
        onOpenSettings={handleOpenSettings}
      />
    </div>
  );
}
