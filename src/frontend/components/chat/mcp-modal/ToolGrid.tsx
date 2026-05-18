import { MCPTool } from "@/types";
import { ToolItem } from "./ToolItem";

interface ToolGridProps {
  tools: MCPTool[];
  onConnect: (toolId: string) => void;
}

export function ToolGrid({ tools, onConnect }: ToolGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 auto-rows-fr">
      {tools.map((tool, index) => (
        <div
          key={tool.id}
          className="animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{
            animationDelay: `${index * 60}ms`,
            animationFillMode: "backwards",
          }}
        >
          <ToolItem tool={tool} onConnect={onConnect} />
        </div>
      ))}
    </div>
  );
}
