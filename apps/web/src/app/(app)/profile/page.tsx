"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { User, Mail, Cake, CalendarIcon } from "lucide-react";
import { formatDate } from "@noctis/utils";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import SpotlightCard from "@/shared/components/SpotlightCard";
import { useUser } from "@/features/auth/hooks/useUser";

function toDateInputValue(dateOfBirth: string | null): string {
  return dateOfBirth ? dateOfBirth.slice(0, 10) : "";
}

function parseYmd(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (y === undefined || m === undefined || d === undefined) return undefined;
  return new Date(y, m - 1, d);
}

function initialsOf(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { user, loading, updateUser } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email);
    setDateOfBirth(toDateInputValue(user.dateOfBirth));
  }, [user]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    try {
      await updateUser({
        email,
        name: name || undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
      setSaved(true);
    } catch {
      setError("Couldn't save your profile. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !user) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading profile…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">
          Profile
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Manage how you show up across your workspace.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {user && (
          <SpotlightCard className="flex flex-col items-center justify-center gap-3 text-center">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-[var(--color-primary-fg)] ring-4 ring-[var(--color-primary)]/15"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-finance))" }}
              aria-hidden
            >
              {initialsOf(user.name, user.email)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-lg text-[var(--color-text)]">
                {user.name || user.email}
              </p>
              <p className="truncate text-sm text-[var(--color-text-muted)]">{user.email}</p>
            </div>
            <div className="mt-1 w-full border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
              Member since {formatDate(user.createdAt)}
            </div>
          </SpotlightCard>
        )}

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-medium text-[var(--color-text)]">Account details</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Update your personal information.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name" className="items-center gap-1.5">
                    <User className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Name
                  </FieldLabel>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dateOfBirth" className="items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Date of birth
                  </FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="dateOfBirth"
                        type="button"
                        variant="outline"
                        className="h-9 w-full justify-between px-3 font-normal"
                      >
                        <span className={dateOfBirth ? "" : "text-[var(--color-text-muted)]"}>
                          {dateOfBirth
                            ? format(parseYmd(dateOfBirth)!, "dd MMM yyyy")
                            : "Pick a date"}
                        </span>
                        <CalendarIcon className="h-4 w-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        startMonth={new Date(1920, 0)}
                        endMonth={new Date()}
                        disabled={{ after: new Date() }}
                        defaultMonth={parseYmd(dateOfBirth)}
                        selected={parseYmd(dateOfBirth)}
                        onSelect={(date) =>
                          setDateOfBirth(date ? format(date, "yyyy-MM-dd") : "")
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="email" className="items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                <p className="text-sm" aria-live="polite">
                  {error && <span className="text-[var(--color-passwords)]">{error}</span>}
                  {saved && !error && <span className="text-[var(--color-habits)]">Profile saved.</span>}
                </p>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
