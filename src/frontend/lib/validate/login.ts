import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export enum LoginField {
  EMAIL = "email",
  PASSWORD = "password",
}

export interface LoginData {
  email: string;
  password: string;
}
export type ValidationErrors = Partial<Record<keyof LoginData, string>>;
