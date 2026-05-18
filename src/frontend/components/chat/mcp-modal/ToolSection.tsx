import { LucideIcon } from "lucide-react";
import { MCPTool } from "@/types";
import { SectionHeader } from "./SectionHeader";
import { ToolGrid } from "./ToolGrid";
import { ShowAllButton } from "./ShowAllButton";
import { ToolGridSkeleton } from "./ToolGridSkeleton";
import { ReactNode } from "react";

interface ToolSectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColorClass?: string;
  iconBgClass?: string;
  tools: MCPTool[];
  displayedTools: MCPTool[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onConnect: (toolId: string) => void;
  accentColor?: "blue" | "orange";
  action?: ReactNode;
  showExpandButton?: boolean;
  isLoading?: boolean;
}

export function ToolSection({
  title,
  description,
  icon,
  iconColorClass,
  iconBgClass,
  tools,
  displayedTools,
  isExpanded,
  onToggleExpand,
  onConnect,
  accentColor = "blue",
  action,
  showExpandButton = true,
  isLoading = false,
}: ToolSectionProps) {
  const shouldShowExpandButton =
    showExpandButton && tools.length > 4 && !isLoading;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={icon}
        title={title}
        description={description}
        iconColorClass={iconColorClass}
        iconBgClass={iconBgClass}
        action={action}
      />

      {isLoading ? (
        <ToolGridSkeleton count={isExpanded ? 8 : 4} />
      ) : (
        <ToolGrid tools={displayedTools} onConnect={onConnect} />
      )}

      {shouldShowExpandButton && (
        <ShowAllButton
          isExpanded={isExpanded}
          totalCount={tools.length}
          onClick={onToggleExpand}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}
