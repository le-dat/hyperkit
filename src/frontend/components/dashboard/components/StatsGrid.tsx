import { Zap, Activity, Coins, Wallet } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import { Workflow } from "@/types";

interface StatsGridProps {
  workflows: Workflow[];
}

export function StatsGrid({ workflows }: StatsGridProps) {
  const activeCount = workflows.filter((w) => w.status === "active").length;
  const totalRuns = 12543;
  const avgCost = 4.2;
  const creditsLeft = 145;
  const tokenBalance = 2500;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      <StatsCard
        label="Active Agents"
        value={activeCount}
        icon={Zap}
        iconColor="text-green-500"
        trend={{ value: "+2 this week", isPositive: true }}
        subtitle="Running workflows"
      />
      <StatsCard
        label="Monthly Runs"
        value={totalRuns.toLocaleString()}
        icon={Activity}
        iconColor="text-blue-500"
        trend={{ value: "+12.5%", isPositive: true }}
        subtitle="Total executions"
      />
      <StatsCard
        label="Token Balance"
        value={tokenBalance.toLocaleString()}
        icon={Coins}
        variant="gradient"
        subtitle="Available tokens"
        badge="Pro"
      />
      <StatsCard
        label="Credits"
        value={`$${creditsLeft}`}
        icon={Wallet}
        variant="accent"
        subtitle={`~${Math.floor(creditsLeft / avgCost)} days left`}
        trend={{ value: "-$15.20", isPositive: false }}
      />
    </div>
  );
}
