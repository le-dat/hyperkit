interface ChevronIconProps {
  direction: "up" | "down";
}

export function ChevronIcon({ direction }: ChevronIconProps) {
  const isUp = direction === "up";
  const path = isUp ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7";
  const hoverClass = isUp
    ? "group-hover:translate-y-[-2px]"
    : "group-hover:translate-y-[2px]";

  return (
    <svg
      className={`w-4 h-4 transition-transform ${hoverClass}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={path}
      />
    </svg>
  );
}
