import { ChevronIcon } from "./ChevronIcon";

interface ShowAllButtonProps {
  isExpanded: boolean;
  totalCount: number;
  onClick: () => void;
  accentColor?: "blue" | "orange";
}

const ACCENT_COLORS = {
  blue: {
    border: "hover:border-blue-500/50",
    gradient: "from-blue-500/0 via-blue-500/5 to-blue-500/0",
  },
  orange: {
    border: "hover:border-orange-500/50",
    gradient: "from-orange-500/0 via-orange-500/5 to-orange-500/0",
  },
};

export function ShowAllButton({
  isExpanded,
  totalCount,
  onClick,
  accentColor = "blue",
}: ShowAllButtonProps) {
  const colors = ACCENT_COLORS[accentColor];

  return (
    <button
      onClick={onClick}
      className={`group w-full py-3 rounded-xl border-2 border-hyper-800 text-xs font-bold text-hyper-300 hover:text-white ${colors.border} transition-all hover:bg-hyper-900/50 relative overflow-hidden`}
    >
      <div
        className={`absolute inset-0 bg-linear-to-r ${colors.gradient} -translate-x-full group-hover:translate-x-full transition-transform duration-700`}
      />
      <span className="relative flex items-center justify-center gap-2">
        {isExpanded ? (
          <>
            <span>Show Less</span>
            <ChevronIcon direction="up" />
          </>
        ) : (
          <>
            <span>Show All ({totalCount})</span>
            <ChevronIcon direction="down" />
          </>
        )}
      </span>
    </button>
  );
}
