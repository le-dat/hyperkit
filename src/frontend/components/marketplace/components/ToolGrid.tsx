import { MarketplaceTool } from "@/types";
import { ToolCard } from "@/components/ui/tool-card";

interface ToolGridProps {
  tools: MarketplaceTool[];
  onSelectTool?: (tool: MarketplaceTool) => void;
}

export function ToolGrid({ tools, onSelectTool }: ToolGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          name={tool.name}
          description={tool.description}
          author={tool.author}
          downloads={tool.downloads}
          stars={tool.stars}
          category={tool.category}
          status={tool.status}
          icon={tool.icon as "Box" | "Database" | "Zap"}
          onClick={() => onSelectTool?.(tool)}
        />
      ))}
    </div>
  );
}
