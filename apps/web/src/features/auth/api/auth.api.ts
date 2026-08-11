import { api } from "@/lib/api";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", { email, password });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", { email, password });
}
