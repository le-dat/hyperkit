import { Workflow } from "@/types";
import { WorkflowCard } from "@/components/ui/workflow-card";

interface WorkflowGridProps {
  workflows: Workflow[];
  onSelectWorkflow: (workflow: Workflow) => void;
}

export function WorkflowGrid({
  workflows,
  onSelectWorkflow,
}: WorkflowGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          onClick={() => onSelectWorkflow(workflow)}
        />
      ))}
    </div>
  );
}
