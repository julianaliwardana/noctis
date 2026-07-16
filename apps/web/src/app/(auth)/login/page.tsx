"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/shared/components/Card";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { login } from "@/features/auth/api/auth.api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { accessToken } = await login(email, password);
      setToken(accessToken);
      router.push("/dashboard");
    } catch {
      setError("That email and password don't match our records.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="relative z-10 w-full max-w-sm bg-[var(--color-surface)]/85 backdrop-blur-xl">
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
        Welcome back
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">Sign in to your Noctis workspace.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        {error && <p className="text-sm text-[var(--color-passwords)]">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        New here?{" "}
        <Link href="/register" className="text-[var(--color-primary)]">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
