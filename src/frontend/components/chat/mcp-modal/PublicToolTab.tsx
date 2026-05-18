import { Input } from "@/components/ui/input";
import { MCPTool } from "@/types";
import { Search } from "lucide-react";
import { ToolItem } from "./ToolItem";
import { ToolGridSkeleton } from "./ToolGridSkeleton";

interface PublicToolTabProps {
  tools: MCPTool[];
  onConnect: (toolId: string) => void;
  isLoading?: boolean;
}

export function PublicToolTab({
  tools,
  onConnect,
  isLoading = false,
}: PublicToolTabProps) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hyper-500" />
        <Input
          type="text"
          placeholder="Search tools..."
          className="pl-10 h-9 bg-hyper-950 border-hyper-800 text-white placeholder:text-hyper-500 focus:border-hyper-accent"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <ToolGridSkeleton count={4} />
        ) : tools.length > 0 ? (
          tools.map((tool) => (
            <ToolItem key={tool.id} tool={tool} onConnect={onConnect} />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-hyper-500">No tools found</div>
        )}
      </div>
    </>
  );
}