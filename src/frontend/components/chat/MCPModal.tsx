"use client";

import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalHeader } from "@/components/ui/modal";
import { MCPTool } from "@/types";
import { mcpService } from "@/service/mcpService";
import { PublicToolTab } from "./mcp-modal/PublicToolTab";

interface MCPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (toolId: string) => void;
}

export function MCPModal({ isOpen, onClose, onConnect }: MCPModalProps) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTools();
    }
  }, [isOpen]);

  const fetchTools = async () => {
    setIsLoading(true);
    try {
      const servers = await mcpService.getServers();
      setTools(servers);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="max-h-[80vh] h-[80vh] flex flex-col"
    >
      <ModalHeader
        title="MCP Tools"
        description="Connect Model Context Protocol integrations"
        className="bg-transparent p-0"
      />

      <ModalContent className="flex-1 overflow-y-auto p-4 bg-linear-to-b from-transparent to-hyper-950/30 custom-scrollbar">
        <PublicToolTab tools={tools} onConnect={onConnect} isLoading={isLoading} />
      </ModalContent>
    </Modal>
  );
}