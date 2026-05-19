export function ToolItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-hyper-800 bg-hyper-900/50 animate-pulse">
      {/* Icon skeleton */}
      <div className="w-9 h-9 rounded-lg bg-hyper-800 shrink-0" />

      {/* Content skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-hyper-800 rounded w-1/4" />
          <div className="h-3.5 bg-hyper-800 rounded w-12" />
        </div>
        <div className="h-3 bg-hyper-800 rounded w-2/3 mt-2" />
      </div>

      {/* Button skeleton */}
      <div className="shrink-0">
        <div className="h-7 bg-hyper-800 rounded-lg w-16" />
      </div>
    </div>
  );
}
