"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader } from "@/components/ui/modal";
import { mcpService, McpCatalogItem } from "@/service/mcpService";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

// Sub-components
import { McpServerItem } from "./mcp-modal/McpServerItem";
import { CredentialConfigForm } from "./mcp-modal/CredentialConfigForm";
import { OAuthPlaceholder } from "./mcp-modal/OAuthPlaceholder";

interface MCPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (toolId: string) => void;
}

type TabType = "public" | "api_key" | "oauth";

export function MCPModal({ isOpen, onClose }: MCPModalProps) {
  const [catalog, setCatalog] = useState<McpCatalogItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServerForKey, setSelectedServerForKey] = useState<McpCatalogItem | null>(null);
  // Store only server names that have a key being configured locally — never persist plaintext keys
  const [pendingKeyServer, setPendingKeyServer] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
    }
  }, [isOpen]);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const items = await mcpService.getCatalog();
      setCatalog(items);
    } catch (err) {
      console.error("Failed to fetch catalog:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (item: McpCatalogItem) => {
    if (isToggling) return;

    if (!item.enabled && item.auth_type === "api_key" && !item.configured) {
      setSelectedServerForKey(item);
      return;
    }

    setIsToggling(true);
    try {
      const nextState = !item.enabled;
      const response = await mcpService.toggleMcp(item.name, nextState);
      if (response.success) {
        setCatalog((prev) =>
          prev.map((c) => (c.name === item.name ? { ...c, enabled: nextState } : c))
        );
      }
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setIsToggling(false);
    }
  };

  // Handle save from CredentialConfigForm — token never leaves the form's local state
  const handleSaveKey = async (token: string) => {
    if (!selectedServerForKey || isToggling) return;

    setIsToggling(true);
    try {
      const response = await mcpService.toggleMcp(selectedServerForKey.name, true, token);
      if (response.success) {
        setCatalog((prev) =>
          prev.map((c) =>
            c.name === selectedServerForKey.name ? { ...c, enabled: true, configured: true } : c
          )
        );
        setSelectedServerForKey(null);
      }
    } catch (err) {
      console.error("Failed to configure server key:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDeleteKey = async (item: McpCatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isToggling) return;

    if (!confirm(`Are you sure you want to clear your credentials for ${item.label}?`)) return;

    setIsToggling(true);
    try {
      const response = await mcpService.deleteKey(item.name);
      if (response.success) {
        setCatalog((prev) =>
          prev.map((c) => (c.name === item.name ? { ...c, enabled: false, configured: false } : c))
        );
      }
    } catch (err) {
      console.error("Failed to delete server key:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesTab = item.auth_type === activeTab;
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="max-h-[85vh] h-[80vh] flex flex-col relative overflow-hidden"
    >
      <ModalHeader
        title="MCP Integrations"
        description="Choose, configure, and toggle Model Context Protocol servers instantly."
        className="bg-transparent p-0"
      />

      <ModalContent className="flex-1 overflow-hidden p-0 flex flex-col bg-linear-to-b from-transparent to-hyper-950/20">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-hyper-800 bg-hyper-950/50 px-4 pt-2">
          {(["public", "api_key", "oauth"] as TabType[]).map((tab) => {
            const label = tab === "public" ? "Public Servers" : tab === "api_key" ? "API Key Required" : "OAuth Flows";
            const TabIcon = tab === "public" ? LucideIcons.Globe : tab === "api_key" ? LucideIcons.KeyRound : LucideIcons.LockKeyhole;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                  activeTab === tab
                    ? "border-hyper-accent text-white"
                    : "border-transparent text-hyper-400 hover:text-hyper-200"
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-hyper-800 bg-hyper-950/30">
          <div className="relative">
            <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hyper-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "public" ? "public" : activeTab === "api_key" ? "api key" : "oauth"} integrations...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-hyper-950/80 border border-hyper-800 rounded-xl text-white placeholder:text-hyper-500 focus:border-hyper-accent focus:ring-1 focus:ring-hyper-accent outline-none text-sm transition-all"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Catalog Items Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-hyper-900/30 border border-hyper-800 animate-pulse flex items-center px-4 gap-4">
                  <div className="w-10 h-10 rounded-lg bg-hyper-800/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-hyper-800/50 rounded w-1/3" />
                    <div className="h-3 bg-hyper-800/30 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "oauth" ? (
            <OAuthPlaceholder />
          ) : filteredCatalog.length > 0 ? (
            filteredCatalog.map((item) => (
              <McpServerItem
                key={item.name}
                item={item}
                isToggling={isToggling}
                onToggle={handleToggle}
                onConfigure={setSelectedServerForKey}
                onDeleteKey={handleDeleteKey}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-hyper-500">No integrations found</div>
          )}
        </div>

        {/* Slide-in API Key Modal Form — token is ephemeral, never stored in parent state */}
        {selectedServerForKey && (
          <CredentialConfigForm
            item={selectedServerForKey}
            isToggling={isToggling}
            onCancel={() => setSelectedServerForKey(null)}
            onSave={handleSaveKey}
          />
        )}
      </ModalContent>
    </Modal>
  );
}