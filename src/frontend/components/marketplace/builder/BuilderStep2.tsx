import { Globe, Lock, Code } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/input";

interface BuilderStep2Props {
  endpoint: string;
  authType: string;
  schema: string;
  onEndpointChange: (endpoint: string) => void;
  onAuthTypeChange: (authType: string) => void;
  onSchemaChange: (schema: string) => void;
}

export function BuilderStep2({
  endpoint,
  authType,
  schema,
  onEndpointChange,
  onAuthTypeChange,
  onSchemaChange,
}: BuilderStep2Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up h-full">
      <div className="space-y-6">
        <div>
          <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-hyper-400" /> API Endpoint
          </label>
          <Input
            type="text"
            value={endpoint}
            onChange={(e) => onEndpointChange(e.target.value)}
            placeholder="https://api.myapp.com/mcp"
          />
          <p className="text-xs text-hyper-500 mt-2">
            The URL where your MCP server is running (SSE supported).
          </p>
        </div>
        <div>
          <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-hyper-400" /> Authentication
          </label>
          <Select
            value={authType}
            onChange={(e) => onAuthTypeChange(e.target.value)}
          >
            <option value="none">None (Public)</option>
            <option value="api_key">API Key Header</option>
            <option value="oauth">OAuth 2.0</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-col h-full">
        <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
          <Code className="w-4 h-4 text-hyper-400" /> Schema Definition (JSON)
        </label>
        <div className="flex-1 bg-hyper-900/50 border border-hyper-700 rounded-xl p-1 relative group">
          <Textarea
            value={schema}
            onChange={(e) => onSchemaChange(e.target.value)}
            className="w-full h-full bg-transparent text-xs font-mono text-green-400 p-3 resize-none"
          />
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-xs bg-hyper-800 text-white px-2 py-1 rounded border border-hyper-600">
              Format
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
