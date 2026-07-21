"use client";

import { useEffect } from "react";
import { useUserStore } from "../store/userStore";

export function useUser() {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const fetchUser = useUserStore((state) => state.fetchUser);
  const updateUser = useUserStore((state) => state.updateUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, updateUser };
}
