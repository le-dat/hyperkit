export function ToolItemSkeleton() {
  return (
    <div className="flex flex-col h-[180px] p-4 rounded-xl bg-hyper-900 border border-hyper-800 animate-pulse">
      {/* Title skeleton */}
      <div className="h-5 bg-hyper-800 rounded w-3/4 mb-2" />

      {/* Description skeleton - 3 lines */}
      <div className="space-y-2 mb-4 flex-1">
        <div className="h-3 bg-hyper-800 rounded w-full" />
        <div className="h-3 bg-hyper-800 rounded w-5/6" />
        <div className="h-3 bg-hyper-800 rounded w-4/6" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 bg-hyper-800 rounded-lg w-24 ml-auto" />
    </div>
  );
}
