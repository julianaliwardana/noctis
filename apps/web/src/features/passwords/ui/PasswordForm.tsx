"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import type { AddPasswordInput } from "../store/passwordsStore";

export interface PasswordFormProps {
  onAdd: (input: AddPasswordInput) => void;
}

export function PasswordForm({ onAdd }: PasswordFormProps) {
  const [siteName, setSiteName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (!siteName.trim() || !username.trim() || !password) return;

    onAdd({ siteName: siteName.trim(), username: username.trim(), password });
    setSiteName("");
    setUsername("");
    setPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
      <Input
        value={siteName}
        onChange={(event) => setSiteName(event.target.value)}
        placeholder="Site name"
        aria-label="Site name"
      />
      <Input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        aria-label="Username"
      />
      <div className="flex gap-2">
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Password"
          aria-label="Password"
          className="flex-1"
        />
        <Button type="submit" style={{ ["--color-primary" as string]: "var(--color-passwords)" }}>
          Save
        </Button>
      </div>
    </form>
  );
}
