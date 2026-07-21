import { create } from "zustand";
import * as userApi from "../api/user.api";
import type { UpdateUserInput, UserDto } from "../api/user.api";

interface UserState {
  user: UserDto | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  updateUser: (input: UpdateUserInput) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,

  fetchUser: async () => {
    set({ loading: true });
    const user = await userApi.fetchMe();
    set({ user, loading: false });
  },

  updateUser: async (input) => {
    const user = await userApi.updateMe(input);
    set({ user });
  },
}));
