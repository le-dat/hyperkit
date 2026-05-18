import { NextResponse } from "next/server";
import type { ApiError, ApiSuccess } from "@/types";

export function successResponse<T>(
  data: T,
  status = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  code?: string,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { message, status, code } },
    { status },
  );
}
