"use client";

import { MarketplaceItem, MarketplaceTool, NodeType, WorkflowEdge, WorkflowNode } from "@/types";
import {
  Box,
  Check,
  Download,
  Layers,
  Settings,
  Shield,
  Star,
  Tag,
  User,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { MCPBuilder } from "./MCPBuilder";
import { CategoryFilter } from "./components/CategoryFilter";
import { MarketplaceHeader } from "./components/MarketplaceHeader";
import { MarketplaceTabs } from "./components/MarketplaceTabs";
import { ToolGrid } from "./components/ToolGrid";
import { WorkflowGrid } from "./components/WorkflowGrid";

interface MarketplaceProps {
  onInstall?: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

const mockTemplates: MarketplaceItem[] = [
  {
    id: "1",
    title: "DeFi Arbitrage Scanner",
    description:
      "Monitors price discrepancies across Uniswap and SushiSwap, executing trades when profitable. Includes slippage protection and gas optimization logic.",
    author: "CryptoWhale",
    downloads: "2.4k",
    stars: 154,
    category: "DeFi",
    nodes: [
      {
        id: "1",
        type: NodeType.TRIGGER,
        position: { x: 100, y: 300 },
        data: { label: "Every 10s", icon: "Clock" },
      },
      {
        id: "2",
        type: NodeType.DEFI_SWAP,
        position: { x: 400, y: 200 },
        data: { label: "Check Uniswap", icon: "RefreshCw" },
      },
      {
        id: "3",
        type: NodeType.DEFI_SWAP,
        position: { x: 400, y: 400 },
        data: { label: "Check Sushi", icon: "RefreshCw" },
      },
      {
        id: "4",
        type: NodeType.CONDITION,
        position: { x: 700, y: 300 },
        data: { label: "Diff > 2%", icon: "GitBranch" },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e1-3", source: "1", target: "3" },
      { id: "e2-4", source: "2", target: "4" },
      { id: "e3-4", source: "3", target: "4" },
    ],
  },
  {
    id: "2",
    title: "Sentiment Analysis Bot",
    description:
      "Scrapes Twitter/X for token mentions, runs Gemini analysis to determine market sentiment, and posts a summary to a private Discord channel.",
    author: "HyperTeam",
    downloads: "5.1k",
    stars: 320,
    category: "Social",
    nodes: [
      {
        id: "1",
        type: NodeType.TRIGGER,
        position: { x: 100, y: 300 },
        data: { label: "Twitter Search", icon: "Twitter" },
      },
      {
        id: "2",
        type: NodeType.MCP_TOOL,
        position: { x: 400, y: 300 },
        data: { label: "Gemini Sentiment", icon: "Sparkles" },
      },
      {
        id: "3",
        type: NodeType.NOTIFICATION,
        position: { x: 700, y: 300 },
        data: { label: "Post to Discord", icon: "MessageSquare" },
      },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", animated: true },
      { id: "e2-3", source: "2", target: "3" },
    ],
  },
  {
    id: "3",
    title: "Auto-Compound Yield",
    description:
      "Automatically claims rewards from Aave and restakes them every 24 hours to maximize APY. Handles gas estimation and transaction batching.",
    author: "DeFi_Dad",
    downloads: "1.2k",
    stars: 89,
    category: "DeFi",
    nodes: [],
    edges: [],
  },
  {
    id: "4",
    title: "Customer Support Agent",
    description:
      "Connects to Zendesk, classifies tickets using AI, and drafts auto-responses based on your knowledge base.",
    author: "SupportHero",
    downloads: "890",
    stars: 45,
    category: "Business",
    nodes: [],
    edges: [],
  },
  {
    id: "5",
    title: "Github PR Reviewer",
    description:
      "Automatically reviews new PRs, checks for security vulnerabilities using MCP tools, and comments with suggestions.",
    author: "DevOps_Master",
    downloads: "3.4k",
    stars: 210,
    category: "DevOps",
    nodes: [],
    edges: [],
  },
  {
    id: "6",
    title: "Meeting Summarizer",
    description:
      "Record Google Meets, transcribe with Whisper, summarize with Gemini, email to attendees.",
    author: "ProductivityHacker",
    downloads: "9k",
    stars: 550,
    category: "Productivity",
    nodes: [],
    edges: [],
  },
];

const mockTools: MarketplaceTool[] = [
  {
    id: "t1",
    name: "Solana Chain Reader",
    description: "Read account data, transaction history, and token balances from Solana mainnet.",
    author: "SolanaLabs",
    downloads: "12k",
    stars: 450,
    category: "Crypto",
    status: "verified",
    icon: "Box",
  },
  {
    id: "t2",
    name: "Notion Sync",
    description: "Full CRUD access to Notion databases and pages. Supports block appending.",
    author: "NotionUser_99",
    downloads: "8.5k",
    stars: 312,
    category: "Productivity",
    status: "community",
    icon: "Database",
  },
  {
    id: "t3",
    name: "Stable Diffusion Gen",
    description: "Generate images from text prompts using a hosted Stable Diffusion instance.",
    author: "ArtAI",
    downloads: "3.2k",
    stars: 189,
    category: "AI Model",
    status: "community",
    icon: "Zap",
  },
];

export function Marketplace({ onInstall }: MarketplaceProps) {
  const [activeTab, setActiveTab] = useState<"workflows" | "tools">("workflows");
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [tools, setTools] = useState<MarketplaceTool[]>(mockTools);

  const handleInstall = () => {
    if (selectedItem && onInstall) {
      onInstall(selectedItem.nodes, selectedItem.edges);
      setSelectedItem(null);
    }
  };

  const handleToolPublish = (newTool: { name: string; description: string; category: string }) => {
    const tool: MarketplaceTool = {
      id: Date.now().toString(),
      name: newTool.name,
      description: newTool.description,
      author: "You",
      downloads: "0",
      stars: 0,
      category: newTool.category,
      status: "community",
      icon: "Box",
    };
    setTools([tool, ...tools]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-hyper-950">
      <MCPBuilder
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        onPublish={handleToolPublish}
      />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <MarketplaceHeader />
          <MarketplaceTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onPublishClick={() => setShowBuilder(true)}
          />

          {/* Category Filter */}
          <CategoryFilter />

          {activeTab === "workflows" ? (
            <WorkflowGrid workflows={mockTemplates} onSelectWorkflow={setSelectedItem} />
          ) : (
            <ToolGrid tools={tools} />
          )}
        </div>
      </div>

      {/* Item Detail & Config Modal (Workflows Only for now) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-hyper-950 border border-hyper-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-hyper-800 bg-hyper-900 flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-hyper-accent to-orange-600 rounded-xl shadow-lg shadow-hyper-accent/20 flex items-center justify-center text-white">
                  <Tag className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedItem.title}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-hyper-400">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" /> {selectedItem.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" /> {selectedItem.stars} stars
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-4 h-4" /> {selectedItem.downloads} installs
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-hyper-800 rounded-lg text-hyper-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
              {/* Left: Description & Info */}
              <div className="p-8 md:w-1/2 space-y-6 border-b md:border-b-0 md:border-r border-hyper-800">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-hyper-accent" /> Description
                  </h3>
                  <p className="text-hyper-300 leading-relaxed text-sm">
                    {selectedItem.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4 text-hyper-accent" /> Workflow Preview
                  </h3>
                  <div className="bg-hyper-900 rounded-xl border border-hyper-800 p-4 space-y-3">
                    {(selectedItem.nodes.length > 0
                      ? selectedItem.nodes
                      : [
                          {
                            id: "1",
                            type: NodeType.TRIGGER,
                            position: { x: 0, y: 0 },
                            data: { label: "Trigger Event" },
                          },
                          {
                            id: "2",
                            type: NodeType.MCP_TOOL,
                            position: { x: 0, y: 0 },
                            data: { label: "Process Logic" },
                          },
                          {
                            id: "3",
                            type: NodeType.NOTIFICATION,
                            position: { x: 0, y: 0 },
                            data: { label: "Action Output" },
                          },
                        ]
                    ).map((node, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-hyper-600"></div>
                          {i < 2 && <div className="w-px h-6 bg-hyper-800 my-1"></div>}
                        </div>
                        <div className="text-xs font-mono text-hyper-300 bg-hyper-950 px-3 py-1.5 rounded border border-hyper-800 w-full">
                          {node.data.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-hyper-accent" /> Security
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20 w-fit">
                    <Check className="w-3 h-3" /> Audited by Hyperkit Safe
                  </div>
                </div>
              </div>

              {/* Right: Configuration */}
              <div className="p-8 md:w-1/2 bg-hyper-900/30">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-hyper-accent" /> Configuration
                </h3>

                <div className="space-y-6">
                  {/* Required Connections */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-hyper-400 uppercase">
                      Required Tools
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-hyper-900 border border-hyper-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                            <Box className="w-5 h-5 text-black" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">GitHub</p>
                            <p className="text-[10px] text-hyper-500">Read access required</p>
                          </div>
                        </div>
                        <button className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Connected
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-hyper-900 border border-hyper-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#5865F2] flex items-center justify-center">
                            <Box className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Discord</p>
                            <p className="text-[10px] text-hyper-500">Bot token required</p>
                          </div>
                        </div>
                        <button className="text-xs bg-hyper-800 text-hyper-300 px-2 py-1 rounded border border-hyper-600 hover:bg-hyper-700">
                          Connect
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Template Variables */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-hyper-400 uppercase">
                      Template Variables
                    </label>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-hyper-300 mb-1.5">
                          Target Channel ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 123456789"
                          className="w-full bg-hyper-950 border border-hyper-700 rounded-lg px-3 py-2 text-sm text-white focus:border-hyper-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-hyper-300 mb-1.5">
                          Check Interval
                        </label>
                        <select className="w-full bg-hyper-950 border border-hyper-700 rounded-lg px-3 py-2 text-sm text-white focus:border-hyper-accent focus:outline-none">
                          <option>Every 5 minutes</option>
                          <option>Every 1 hour</option>
                          <option>Daily</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-hyper-800 bg-hyper-900 flex justify-end gap-3">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-hyper-400 hover:text-white hover:bg-hyper-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInstall}
                className="bg-hyper-accent hover:bg-hyper-accentHover text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-hyper-accent/20 hover:scale-105"
              >
                <Zap className="w-4 h-4" /> Install Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
