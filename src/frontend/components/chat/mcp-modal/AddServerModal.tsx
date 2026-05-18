"use client";

import { Server, X } from "lucide-react";
import { useState } from "react";
import { Input, Select } from "@/components/ui/input";

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServerFormData) => void;
}

export interface ServerFormData {
  name: string;
  transport: "sse" | "stdio";
  url: string;
}

export function AddServerModal({
  isOpen,
  onClose,
  onSubmit,
}: AddServerModalProps) {
  const [formData, setFormData] = useState<ServerFormData>({
    name: "",
    transport: "sse",
    url: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({ name: "", transport: "sse", url: "" });
    onClose();
  };

  const handleChange = (field: keyof ServerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-lg bg-hyper-950 border border-hyper-800 rounded-2xl shadow-2xl shadow-hyper-accent/10 pointer-events-auto animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-hyper-800/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-hyper-accent/10 border border-hyper-accent/20">
                <Server className="w-6 h-6 text-hyper-accent" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Add Custom MCP Server
                </h2>
                <p className="text-xs text-hyper-500 mt-0.5">
                  Connect to your private or local server
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-hyper-900 transition-colors group"
            >
              <X className="w-5 h-5 text-hyper-500 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Server Name */}
            <div>
              <label className="block text-xs font-bold text-hyper-300 mb-2 uppercase tracking-wide">
                Server Name
              </label>
              <Input
                type="text"
                placeholder="My Custom Tool"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full"
                required
              />
              <p className="text-xs text-hyper-500 mt-1.5">
                A friendly name to identify this server
              </p>
            </div>

            {/* Transport Type */}
            <div>
              <label className="block text-xs font-bold text-hyper-300 mb-2 uppercase tracking-wide">
                Transport Type
              </label>
              <Select
                value={formData.transport}
                onChange={(e) =>
                  handleChange("transport", e.target.value as "sse" | "stdio")
                }
                className="w-full"
              >
                <option value="sse">SSE (Server-Sent Events)</option>
                <option value="stdio" disabled>
                  Stdio (Local Desktop Only)
                </option>
              </Select>
              <p className="text-xs text-hyper-500 mt-1.5">
                SSE is recommended for web-based connections
              </p>
            </div>

            {/* Server URL */}
            <div>
              <label className="block text-xs font-bold text-hyper-300 mb-2 uppercase tracking-wide">
                Server URL
              </label>
              <Input
                type="url"
                placeholder="http://localhost:3000/sse"
                value={formData.url}
                onChange={(e) => handleChange("url", e.target.value)}
                className="w-full font-mono text-sm"
                required
              />
              <p className="text-xs text-hyper-500 mt-1.5">
                The endpoint URL for your MCP server
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-xs font-bold text-blue-400 mb-1">
                    Connection Requirements
                  </p>
                  <p className="text-xs text-hyper-400 leading-relaxed">
                    Make sure your MCP server is running and accessible. For
                    local servers, check that the port is not blocked by a
                    firewall.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-hyper-800 text-sm font-bold text-hyper-300 hover:text-white hover:border-hyper-600 transition-all hover:bg-hyper-900/30"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl bg-linear-to-r from-hyper-accent to-hyper-accentHover text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-hyper-accent/20 hover:shadow-xl hover:shadow-hyper-accent/30"
              >
                Connect Server
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
