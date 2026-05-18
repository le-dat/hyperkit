/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { JWT_TEMPLATES, ServiceConfig } from "@/lib/constants";

export function createProxyHandler(config: ServiceConfig) {
  return async function handleProxyRequest(
    req: NextRequest,
    pathSegments: string[],
    method: string,
  ) {
    try {
      const { getToken } = await auth();
      const token = await getToken({ template: JWT_TEMPLATES.SESSION_900S });

      // Construct the target URL
      const normalizedBase = config.baseUrl?.replace(/\/$/, "");
      const path = pathSegments.join("/");
      const targetUrl = `${normalizedBase}/v1/${path}`;

      // Get query parameters
      const searchParams = req.nextUrl.searchParams;
      const queryString = searchParams.toString();
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

      // Prepare headers
      const headers: Record<string, string> = {
        [config.apiKeyHeader]: config.apiKey || "",
      };

      // Add authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Check if this is a streaming request
      const acceptHeader = req.headers.get("accept");
      const isStreamingRequest = acceptHeader?.includes("text/event-stream");

      // Get request body for non-GET requests
      let data: any = undefined;
      if (method !== "GET") {
        try {
          // Check if request has a body by checking content-length
          const contentLength = req.headers.get("content-length");
          const hasBody = contentLength && parseInt(contentLength) > 0;

          if (hasBody) {
            const contentType = req.headers.get("content-type");
            if (contentType?.includes("application/json")) {
              headers["Content-Type"] = "application/json";
              data = await req.json();
            } else if (contentType?.includes("multipart/form-data")) {
              headers["Content-Type"] = "multipart/form-data";
              data = await req.formData();
            } else if (contentType) {
              data = await req.text();
            }
          }
        } catch (error) {
          console.log("No body or body parsing failed:", error);
        }
      }

      console.log("fullUrl", fullUrl);

      // Handle streaming requests with native fetch
      if (isStreamingRequest) {
        console.log("[Proxy] Streaming request detected, using native fetch");
        try {
          const fetchResponse = await fetch(fullUrl, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
          });

          if (!fetchResponse.ok) {
            throw new Error(
              `Streaming request failed: ${fetchResponse.status}`,
            );
          }

          console.log("[Proxy] Streaming response received, forwarding stream");

          // Forward stream directly with proper headers
          return new Response(fetchResponse.body, {
            status: fetchResponse.status,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        } catch (error: any) {
          console.error("Streaming Proxy Error:", error);
          return new Response(
            JSON.stringify({
              error: "Streaming request failed",
              message: error.message || "Unknown error occurred",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }
      }

      // Handle non-streaming requests with axios
      const response = await axios.request({
        url: fullUrl,
        method,
        headers,
        data,
      });

      // Return the response
      return new Response(JSON.stringify(response.data), {
        status: response.status,
      });
    } catch (error: any) {
      console.error(
        "Proxy Error:",
        JSON.stringify(error) || JSON.stringify(error.response?.data),
      );

      if (axios.isAxiosError(error) && error.response) {
        return new Response(JSON.stringify(error.response.data), {
          status: error.response.status,
        });
      }

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message || "Unknown error occurred",
        }),
        {
          status: 500,
        },
      );
    }
  };
}

export function createRouteHandlers<TParams extends Record<string, string[]>>(
  handler: (
    req: NextRequest,
    pathSegments: string[],
    method: string,
  ) => Promise<Response>,
) {
  const createHandler = async (
    req: NextRequest,
    params: Promise<TParams>,
    method: string,
  ) => {
    const resolvedParams = await params;
    // Extract the catch-all parameter (could be 'path', 'all', or any other name)
    const pathSegments = Object.values(resolvedParams)[0] || [];
    return handler(req, pathSegments, method);
  };

  return {
    async GET(req: NextRequest, { params }: { params: Promise<TParams> }) {
      return createHandler(req, params, "GET");
    },

    async POST(req: NextRequest, { params }: { params: Promise<TParams> }) {
      return createHandler(req, params, "POST");
    },

    async PUT(req: NextRequest, { params }: { params: Promise<TParams> }) {
      return createHandler(req, params, "PUT");
    },

    async DELETE(req: NextRequest, { params }: { params: Promise<TParams> }) {
      return createHandler(req, params, "DELETE");
    },

    async PATCH(req: NextRequest, { params }: { params: Promise<TParams> }) {
      return createHandler(req, params, "PATCH");
    },

    async OPTIONS() {
      return new Response(null, { status: 200 });
    },
  };
}
