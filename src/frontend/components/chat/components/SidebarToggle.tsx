import { PanelLeft, PanelLeftClose } from "lucide-react";

interface SidebarToggleProps {
  isSidebarOpen: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

export function SidebarToggle({
  isSidebarOpen,
  isMobile,
  onToggle,
}: SidebarToggleProps) {
  return (
    <div className="absolute top-4 left-4 z-20 md:hidden">
      <button
        onClick={onToggle}
        className="p-2 text-hyper-400 hover:text-white bg-hyper-950/80 md:bg-hyper-950/50 backdrop-blur rounded-lg border border-hyper-800/50 hover:bg-hyper-800 transition-colors shadow-lg md:shadow-none"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeft className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
