export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error:
    | string
    | {
        message: string;
        status?: number;
        code?: string;
      };
}

export interface ApiResponseWithPagination<T> extends ApiSuccess<T> {
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}
