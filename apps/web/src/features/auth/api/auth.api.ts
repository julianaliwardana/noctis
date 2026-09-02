import { api } from "@/lib/api";

/** Tokens never reach JS any more — these endpoints answer with the user and set httpOnly cookies. */
export interface AuthUser {
  id: string;
  email: string;
}

export function register(email: string, password: string): Promise<AuthUser> {
  return api.post<AuthUser>("/auth/register", { email, password });
}

export function login(email: string, password: string): Promise<AuthUser> {
  return api.post<AuthUser>("/auth/login", { email, password });
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout");
}
