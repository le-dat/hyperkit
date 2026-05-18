"use client";

import ParamRedirect from "@/components/auth/ParamRedirect";
import { AgentDetail } from "@/components/dashboard/AgentDetail";
import { CreateWizard } from "@/components/dashboard/CreateWizard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PATH } from "@/lib/constants";
import { Workflow } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardPage() {
  const [selectedAgent, setSelectedAgent] = useState<Workflow | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();

  const handleWizardComplete = (prompt: string, name: string) => {
    setShowWizard(false);
    router.push(PATH.agent);
  };

  const handleEditWorkflow = (id: string) => {
    setSelectedAgent(null);
    router.push(`${PATH.agent}?id=${id}`);
  };

  return (
    <ParamRedirect>
      <div className="h-full w-full overflow-hidden relative">
        <Dashboard
          onSelectWorkflow={setSelectedAgent}
          onOpenCreate={() => setShowWizard(true)}
          onOpenMarketplace={() => router.push(PATH.marketplace)}
        />

        {/* Create Wizard Overlay */}
        <CreateWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />

        {/* Agent Detail Overlay */}
        {selectedAgent && (
          <div
            className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedAgent(null)}
          >
            <AgentDetail
              workflow={selectedAgent}
              onClose={() => setSelectedAgent(null)}
              onEdit={handleEditWorkflow}
              onRun={(id) => console.log("Running", id)}
            />
          </div>
        )}
      </div>
    </ParamRedirect>
  );
}
