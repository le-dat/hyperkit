interface MarketplaceTabsProps {
  activeTab: "workflows" | "tools";
  onTabChange: (tab: "workflows" | "tools") => void;
  onPublishClick?: () => void;
}

export function MarketplaceTabs({
  activeTab,
  onTabChange,
  onPublishClick,
}: MarketplaceTabsProps) {
  return (
    <div className="flex items-center justify-between mb-8 border-b border-hyper-800 pb-1">
      <div className="flex gap-6">
        <button
          onClick={() => onTabChange("workflows")}
          className={`pb-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "workflows"
              ? "text-white border-hyper-accent"
              : "text-hyper-500 border-transparent hover:text-hyper-300"
          }`}
        >
          Workflows
        </button>
        <button
          onClick={() => onTabChange("tools")}
          className={`pb-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "tools"
              ? "text-white border-hyper-accent"
              : "text-hyper-500 border-transparent hover:text-hyper-300"
          }`}
        >
          MCP Tools
        </button>
      </div>

      {activeTab === "tools" && onPublishClick && (
        <button
          onClick={onPublishClick}
          className="bg-white text-black hover:bg-hyper-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 mb-2"
        >
          + Build & Publish Tool
        </button>
      )}
    </div>
  );
}
