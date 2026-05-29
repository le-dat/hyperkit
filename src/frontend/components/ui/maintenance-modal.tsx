"use client";

import * as React from "react";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useMaintenanceStore } from "@/store/useMaintenanceStore";
import { 
  Server, 
  AlertTriangle, 
  Github,
  ExternalLink
} from "lucide-react";

export function MaintenanceModal() {
  const { isMaintenance, setMaintenance } = useMaintenanceStore();

  const repoUrl = "https://github.com/le-dat/hyperkit";

  return (
    <Modal
      isOpen={isMaintenance}
      onClose={() => setMaintenance(false)}
      showCloseButton={true}
      size="sm"
      className="border-amber-500/20 shadow-amber-950/20"
    >
      <ModalHeader 
        className="border-b border-hyper-800 bg-gradient-to-r from-amber-950/30 to-hyper-900"
        title={
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span>Server Under Maintenance</span>
          </div>
        }
        description="The API Server is currently unavailable in the production environment."
      />
      
      <ModalContent className="space-y-6 bg-hyper-950/95 py-6">
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
          <Server className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-hyper-300">
            System detected a <span className="font-semibold text-amber-400">500 (Internal Server Error)</span>. You can clone the repository to run the local demo version instead.
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 border border-hyper-800/80 rounded-xl bg-hyper-900/30 hover:bg-hyper-900/50 transition-all duration-300 group">
          <div className="p-4 bg-hyper-800/40 rounded-full border border-hyper-700/50 mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
            <Github className="w-12 h-12 text-hyper-200 group-hover:text-white" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1.5">Hyperkit Repository</h3>
          <p className="text-xs text-hyper-400 text-center mb-5 max-w-[240px]">
            Access the complete source code, installation guides, and documentation on GitHub.
          </p>
          <Button 
            asChild
            variant="gradient"
            className="w-full text-xs font-bold"
          >
            <a 
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Github className="w-4 h-4" />
              <span>Go to GitHub</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          </Button>
        </div>
      </ModalContent>

      <ModalFooter className="bg-hyper-900 border-t border-hyper-800 flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setMaintenance(false)}
          className="hover:border-hyper-600"
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
