import { z } from "zod";

export const registerSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export enum RegisterField {
  PASSWORD = "password",
}

export interface RegisterData {
  password: string;
}
export type ValidationErrors = Partial<Record<keyof RegisterData, string>>;
