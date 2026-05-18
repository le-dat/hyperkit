import {
  createProxyHandler,
  createRouteHandlers,
} from "@/lib/gateway/genericProxy";
import { SERVICE_CONFIGS } from "@/lib/constants";

const handler = createProxyHandler(SERVICE_CONFIGS.GATEWAY);
export const { GET, POST, PUT, DELETE, PATCH, OPTIONS } = createRouteHandlers<{
  all: string[];
}>(handler);
