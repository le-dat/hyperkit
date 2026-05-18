import { Server } from "lucide-react";

interface AddServerButtonProps {
  onClick: () => void;
}

export function AddServerButton({ onClick }: AddServerButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 flex items-center gap-2 rounded-lg bg-linear-to-r from-hyper-accent to-hyper-accentHover hover:shadow-xl hover:shadow-hyper-accent/30 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 group"
    >
      <Server className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
      <span>Add Server</span>
    </button>
  );
}
