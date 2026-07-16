"use client";

import { useEffect } from "react";
import { usePasswordsStore } from "../store/passwordsStore";

export function usePasswords() {
  const entries = usePasswordsStore((state) => state.entries);
  const loading = usePasswordsStore((state) => state.loading);
  const fetchEntries = usePasswordsStore((state) => state.fetchEntries);
  const addEntry = usePasswordsStore((state) => state.addEntry);
  const removeEntry = usePasswordsStore((state) => state.removeEntry);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, addEntry, removeEntry };
}
