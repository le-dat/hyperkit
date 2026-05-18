import { WorkflowNode, WorkflowEdge } from "./workflow";

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  author: string;
  downloads: string;
  stars: number;
  category: string;
  image?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface MarketplaceTool {
  id: string;
  name: string;
  description: string;
  author: string;
  downloads: string;
  stars: number;
  category: string;
  status: "verified" | "community";
  icon?: string;
}
