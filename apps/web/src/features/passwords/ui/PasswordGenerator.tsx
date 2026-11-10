"use client";

import { useState } from "react";
import { RefreshCwIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  type CharacterSet,
} from "../crypto/generator";

const SET_LABELS: { key: CharacterSet; label: string }[] = [
  { key: "lowercase", label: "a-z" },
  { key: "uppercase", label: "A-Z" },
  { key: "digits", label: "0-9" },
  { key: "symbols", label: "!@#" },
];

export function PasswordGenerator({ onGenerate }: { onGenerate: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [length, setLength] = useState(DEFAULT_GENERATOR_OPTIONS.length);
  const [sets, setSets] = useState<CharacterSet[]>([...DEFAULT_GENERATOR_OPTIONS.sets]);
  const [preview, setPreview] = useState(() => generatePassword(DEFAULT_GENERATOR_OPTIONS));

  function regenerate(next: { length?: number; sets?: CharacterSet[] } = {}): void {
    setPreview(
      generatePassword({ length: next.length ?? length, sets: next.sets ?? sets }),
    );
  }

  function toggleSet(key: CharacterSet): void {
    // Never let the last set be turned off — an empty alphabet has nothing to generate from.
    const next = sets.includes(key) ? sets.filter((set) => set !== key) : [...sets, key];
    if (next.length === 0) return;
    setSets(next);
    regenerate({ sets: next });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Generate a password">
          <WandSparklesIcon className="size-3.5" aria-hidden />
          Generate
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-[var(--color-border)]/30 px-2 py-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)]">
              {preview}
            </code>
            <button
              type="button"
              onClick={() => regenerate()}
              aria-label="Regenerate"
              className="shrink-0 rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/30 hover:text-[var(--color-text)]"
            >
              <RefreshCwIcon className="size-3.5" aria-hidden />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="gen-length" className="text-xs text-[var(--color-text-muted)]">
              Length
            </label>
            <input
              id="gen-length"
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(event) => {
                const next = Number(event.target.value);
                setLength(next);
                regenerate({ length: next });
              }}
              className="flex-1 accent-[var(--color-passwords)]"
            />
            <span className="w-6 text-right font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)]">
              {length}
            </span>
          </div>

          <div className="flex gap-1.5">
            {SET_LABELS.map(({ key, label }) => {
              const active = sets.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSet(key)}
                  aria-pressed={active}
                  className="flex-1 rounded-md border px-2 py-1 font-[family-name:var(--font-mono)] text-xs transition-colors"
                  style={{
                    borderColor: active ? "var(--color-passwords)" : "var(--color-border)",
                    backgroundColor: active ? "color-mix(in oklab, var(--color-passwords) 10%, transparent)" : "transparent",
                    color: active ? "var(--color-passwords)" : "var(--color-text-muted)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              onGenerate(preview);
              setOpen(false);
            }}
            style={{ ["--color-primary" as string]: "var(--color-passwords)", ["--color-primary-text" as string]: "var(--color-passwords)" }}
          >
            Use this password
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
