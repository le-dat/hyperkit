/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiError } from "@/types/common/api-response";

/**
 * Extracts a user-friendly error message from a backend ApiError or standard Axios error
 */
export function getErrorMessage(error: any): string {
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
