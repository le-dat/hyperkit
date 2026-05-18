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
      {/* Search Bar */}
      <div className="p-4 border-b border-hyper-800 sticky top-0 bg-hyper-950/95 backdrop-blur z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hyper-500" />
          <Input
            type="text"
            placeholder="Search tools..."
            className="pl-10 h-10 bg-hyper-950 border border-hyper-800 text-white placeholder:text-hyper-500 focus:border-hyper-accent"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Tool Grid */}
      <div className="p-4">
        {isLoading ? (
          <ToolGridSkeleton count={8} />
        ) : tools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <ToolItem key={tool.id} tool={tool} onConnect={onConnect} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-lg border border-hyper-800 bg-hyper-950/30">
            <p className="text-sm text-hyper-500">No tools found</p>
          </div>
        )}
      </div>
    </>
  );
}
