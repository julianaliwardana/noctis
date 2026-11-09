import { api } from "@/lib/api";

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
  /** Required by the API only when `email` changes. */
  currentPassword?: string;
}

export function fetchMe(): Promise<UserDto> {
  return api.get<UserDto>("/user/me");
}

export function updateMe(input: UpdateUserInput): Promise<UserDto> {
  return api.patch<UserDto>("/user/me", input);
}
