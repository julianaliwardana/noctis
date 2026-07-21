import { apiFetch } from "@/lib/api";

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  dateOfBirth?: string;
}

export function fetchMe(): Promise<UserDto> {
  return apiFetch<UserDto>("/user/me");
}

export function updateMe(input: UpdateUserInput): Promise<UserDto> {
  return apiFetch<UserDto>("/user/me", { method: "PATCH", body: JSON.stringify(input) });
}
