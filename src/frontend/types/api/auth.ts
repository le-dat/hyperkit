import { ApiSuccess } from "../common/api-response";

export interface User {
  id: string;
  clerkId: string;
  email: string;
  username?: string;
  avatar?: string;
}

export interface SyncUserDto {
  email?: string;
  username?: string;
  avatar?: string;
}

export type SyncUserResponse = ApiSuccess<User>;
export type GetCurrentUserResponse = ApiSuccess<User>;
