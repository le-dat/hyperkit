"use client";

import { Blocks, Package } from "lucide-react";
import { useState } from "react";
import { AddServerButton } from "./AddServerButton";
import { AddServerModal, ServerFormData } from "./AddServerModal";
import { AddToolPromoBanner } from "./AddToolPromoBanner";
import { CUSTOM_TOOLS, INSTALLED_TOOLS } from "./constants";
import { ToolSection } from "./ToolSection";

interface MyToolTabProps {
  onConnect: (toolId: string) => void;
  isLoadingCustomTools?: boolean;
  isLoadingPublicTools?: boolean;
}

export function MyToolTab({
  onConnect,
  isLoadingCustomTools = false,
  isLoadingPublicTools = false,
}: MyToolTabProps) {
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [showAllCustom, setShowAllCustom] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddServer = (data: ServerFormData) => {
    console.log("New server configuration:", data);
  };

  const displayedCatalogTools = showAllCatalog
    ? INSTALLED_TOOLS
    : INSTALLED_TOOLS.slice(0, 4);
  const displayedCustomTools = showAllCustom
    ? CUSTOM_TOOLS
    : CUSTOM_TOOLS.slice(0, 4);

  const totalTools = INSTALLED_TOOLS.length + CUSTOM_TOOLS.length;
  const hasCustomTools =
    displayedCustomTools.length > 0 || isLoadingCustomTools;
  const hasPublicTools =
    displayedCatalogTools.length > 0 || isLoadingPublicTools;

  return (
    <div className="p-4 space-y-6">
      {!hasCustomTools && (
        <AddToolPromoBanner
          totalTools={totalTools}
          onAddTool={() => setIsModalOpen(true)}
        />
      )}

      {hasCustomTools && (
        <ToolSection
          title="Custom Tools"
          description="Self-hosted and private MCP servers"
          icon={Blocks}
          iconColorClass="text-orange-400"
          iconBgClass="bg-linear-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20"
          tools={CUSTOM_TOOLS}
          displayedTools={displayedCustomTools}
          isExpanded={showAllCustom}
          onToggleExpand={() => setShowAllCustom(!showAllCustom)}
          onConnect={onConnect}
          accentColor="orange"
          action={<AddServerButton onClick={() => setIsModalOpen(true)} />}
          isLoading={isLoadingCustomTools}
        />
      )}

      {hasPublicTools && (
        <ToolSection
          title="Public Tools"
          description="Official tools from the MCP marketplace"
          icon={Package}
          iconColorClass="text-blue-400"
          iconBgClass="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
          tools={INSTALLED_TOOLS}
          displayedTools={displayedCatalogTools}
          isExpanded={showAllCatalog}
          onToggleExpand={() => setShowAllCatalog(!showAllCatalog)}
          onConnect={onConnect}
          accentColor="blue"
          isLoading={isLoadingPublicTools}
        />
      )}

      <AddServerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddServer}
      />
    </div>
  );
}
