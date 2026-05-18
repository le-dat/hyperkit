import { Store, Plus, Settings } from "lucide-react";

interface FloatingDockProps {
  onOpenMarketplace?: () => void;
  onOpenCreate?: () => void;
  onOpenSettings?: () => void;
}

export function FloatingDock({
  onOpenMarketplace,
  onOpenCreate,
  onOpenSettings,
}: FloatingDockProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-2 bg-hyper-900/90 backdrop-blur-xl border border-hyper-700 rounded-2xl p-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <button
          onClick={onOpenMarketplace}
          className="group relative flex flex-col items-center justify-center w-16 h-14 rounded-xl hover:bg-hyper-800 transition-all text-hyper-400 hover:text-white"
        >
          <Store className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform text-purple-400" />
          <span className="text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">
            Market
          </span>
        </button>

        <div className="w-px h-8 bg-hyper-700 mx-1"></div>

        <button
          onClick={onOpenCreate}
          className="group relative flex flex-col items-center justify-center w-16 h-16 -mt-8 bg-hyper-accent hover:bg-hyper-accentHover rounded-2xl shadow-[0_4px_20px_rgba(255,62,0,0.4)] hover:shadow-[0_8px_30px_rgba(255,62,0,0.6)] hover:-translate-y-1 transition-all text-white border-4 border-hyper-950"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        <div className="w-px h-8 bg-hyper-700 mx-1"></div>

        <button
          onClick={onOpenSettings}
          className="group relative flex flex-col items-center justify-center w-16 h-14 rounded-xl hover:bg-hyper-800 transition-all text-hyper-400 hover:text-white"
        >
          <Settings className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">
            Settings
          </span>
        </button>
      </div>
    </div>
  );
}
