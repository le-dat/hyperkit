export interface CursorPagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}
