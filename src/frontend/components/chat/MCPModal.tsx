"use client";

import { Modal, ModalContent, ModalHeader } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { Grid, LucideIcon, Server } from "lucide-react";
import { useState } from "react";
import { PUBLIC_TOOLS } from "./mcp-modal/constants";
import { MyToolTab } from "./mcp-modal/MyToolTab";
import { PublicToolTab } from "./mcp-modal/PublicToolTab";

interface MCPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (toolId: string) => void;
}

enum TabType {
  Catalog = "catalog",
  Custom = "custom",
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: TabType.Catalog, label: "Public Tools", icon: Grid },
  { id: TabType.Custom, label: "My Tools", icon: Server },
];

export function MCPModal({ isOpen, onClose, onConnect }: MCPModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.Catalog);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="max-h-[92vh] h-[92vh] flex flex-col"
    >
      {/* Terminal-style Header */}
      <ModalHeader
        title="MCP Tools"
        description="Connect and manage Model Context Protocol integrations"
        className="bg-transparent p-0"
      />

      {/* Tabs */}
      <div className="flex border-b border-white/10 glass">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex-1 px-6 py-4 text-sm font-semibold font-mono transition-all duration-300 flex items-center justify-center gap-2.5",
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-all duration-300",
                  isActive && "scale-110 text-hyper-accent",
                )}
              />
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-hyper-accent to-transparent" />
              )}
            </button>
          );
        })}
      </div>

      <ModalContent className="flex-1 overflow-y-auto p-6 bg-linear-to-b from-transparent to-hyper-950/30 custom-scrollbar">
        {activeTab === TabType.Catalog && (
          <PublicToolTab tools={PUBLIC_TOOLS} onConnect={onConnect} />
        )}
        {activeTab === TabType.Custom && <MyToolTab onConnect={onConnect} />}
      </ModalContent>
    </Modal>
  );
}
