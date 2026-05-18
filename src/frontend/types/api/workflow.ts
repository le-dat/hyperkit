/* eslint-disable @typescript-eslint/no-explicit-any */

export const NodeType = {
  TRIGGER: "trigger",
  CONDITION: "condition",
  DEFI_SWAP: "defi_swap",
  NOTIFICATION: "notification",
  DEFI_YIELD: "defi_yield",
  MCP_TOOL: "mcp_tool",
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export interface NodeData {
  label: string;
  description?: string;
  config?: Record<string, any>;
  status?: "idle" | "running" | "success" | "error";
  icon?: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface ExecutionLog {
  id: string;
  status: "success" | "failed" | "running";
  startTime: Date;
  duration: string;
  trigger: string;
  output?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: "active" | "inactive" | "draft";
  description?: string;
  lastRun?: string;
  source?: "created" | "installed";
  createdAt?: Date;
  runningOn?: string;
  cost?: string;
  recentLogs?: ExecutionLog[];
  image?: string;
}
