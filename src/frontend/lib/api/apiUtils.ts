/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError } from "@/types/common/api-response";
import { SOCIAL_LINKS } from "@/lib/constants";

export const isProduction = (): boolean => process.env.NODE_ENV === "development";

/**
 * Extracts a user-friendly error message from a backend ApiError or standard Axios error
 */
export function getErrorMessage(error: any): string {
  if (isProduction()) {
    return `Server is down. Run it locally to use app: ${SOCIAL_LINKS.GITHUB}`;
  }
  if (error?.response?.data) {
    const data = error.response.data as ApiError;
    if (data.success === false && data.error) {
      if (typeof data.error === "string") {
        return data.error;
      }
      if (typeof data.error === "object" && data.error.message) {
        return data.error.message;
      }
    }
  }
  return error instanceof Error ? error.message : "An unknown error occurred";
}
