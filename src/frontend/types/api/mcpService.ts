/* eslint-disable @typescript-eslint/no-explicit-any */

export type MCPToolStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  provider: string;
  installed: boolean;
  status?: MCPToolStatus;
  lastConnected?: Date;
  version?: string;
  category?: string | string[];
  image?: string;
}

export interface MCPRecommendation {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}
