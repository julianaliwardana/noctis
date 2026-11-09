"use client";

import { useServerSeed } from "@/lib/useServerSeed";
import { useUserStore } from "../store/userStore";
import type { UserDto } from "../api/user.api";

export interface UserSnapshot {
  user: UserDto;
}

export function useUser(initial?: UserSnapshot | null) {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const fetchUser = useUserStore((state) => state.fetchUser);
  const updateUser = useUserStore((state) => state.updateUser);

  const snapshot = useServerSeed(
    initial,
    (data) => useUserStore.setState({ user: data.user, loading: false }),
    fetchUser,
  );

  return { user: snapshot?.user ?? user, loading: snapshot ? false : loading, updateUser };
}
