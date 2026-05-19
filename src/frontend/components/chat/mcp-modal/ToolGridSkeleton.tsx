import { ToolItemSkeleton } from "./ToolItemSkeleton";

interface ToolGridSkeletonProps {
  count?: number;
}

export function ToolGridSkeleton({ count = 3 }: ToolGridSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{
            animationDelay: `${index * 80}ms`,
            animationFillMode: "backwards",
          }}
        >
          <ToolItemSkeleton />
        </div>
      ))}
    </div>
  );
}
