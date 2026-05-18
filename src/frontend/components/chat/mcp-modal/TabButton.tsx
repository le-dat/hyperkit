import { LucideIcon } from "lucide-react";

interface TabButtonProps {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}

export function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 py-4 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all border-b-4 ${
        isActive
          ? "border-hyper-accent text-white bg-hyper-950"
          : "border-hyper-800 text-gray-500 hover:text-gray-300 bg-black hover:bg-hyper-950/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
