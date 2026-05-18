export const PATH = {
  root: "/",
  dashboard: "/dashboard",
  auth: "/auth",
  login: "/auth/login",
  register: "/auth/register",
  verifyCode: "/auth/verify-code",
  ssoCallback: "/auth/sso-callback",
  marketplace: "/marketplace",
  agent: "/agent",
};

export const LOGO_PATH = "/logo.svg";

export const BUILD_ID = "build_id";

export const REDIRECT_PARAM = "redirect";
export const PATH_LOGIN_SUCCESS = PATH.agent;

export const JWT_TEMPLATES = {
  SESSION_900S: "session_900s",
  LONG_LIVED_TESTING: "long_lived_testing_template",
} as const;

export interface ServiceConfig {
  baseUrl: string;
  apiKey: string;
  apiKeyHeader: string;
}

export const SERVICE_CONFIGS = {
  GATEWAY: {
    baseUrl: process.env.GATEWAY_BASE_URL || "",
    apiKey: process.env.GATEWAY_API_KEY || "",
    apiKeyHeader: "X-API-Key",
  },
  CHAT: {
    baseUrl: process.env.CHAT_BASE_URL || "",
    apiKey: process.env.CHART_API_KEY || "",
    apiKeyHeader: "X-API-Key",
  },
  MCP: {
    baseUrl: process.env.MCP_BASE_URL || "",
    apiKey: process.env.MCP_API_KEY || "",
    apiKeyHeader: "X-API-Key",
  },
} as const satisfies Record<string, ServiceConfig>;

export const BACKEND_ROUTES = {
  agent: ["/agent"],
  sse: ["/sse"],
  history: ["/history"],
  mcp: ["/mcp"],
} as const;

export const API_V1_PREFIX = "/v1";

export const TOTAL_ONBOARDING_STEPS = 2;

export const SOCIAL_LINKS = {
  TWITTER: "https://twitter.com/hyperkit",
  TELEGRAM: "https://t.me/hyperkit",
  EMAIL: "mailto:contact@hyperkit.com",
} as const;
