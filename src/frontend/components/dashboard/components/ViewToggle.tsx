import { Grid, List } from "lucide-react";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange?: (view: "grid" | "list") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-hyper-900 rounded-lg p-1 border border-hyper-800">
      <button
        onClick={() => onViewChange?.("grid")}
        className={`p-1.5 rounded transition-colors ${
          view === "grid"
            ? "bg-hyper-800 text-white shadow"
            : "text-hyper-500 hover:text-white"
        }`}
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewChange?.("list")}
        className={`p-1.5 rounded transition-colors ${
          view === "list"
            ? "bg-hyper-800 text-white shadow"
            : "text-hyper-500 hover:text-white"
        }`}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
