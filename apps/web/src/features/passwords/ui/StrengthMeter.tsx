"use client";

import { scorePassword } from "../crypto/generator";

const TONES = [
  "var(--color-passwords)",
  "var(--color-passwords)",
  "var(--color-text-muted)",
  "var(--color-habits)",
] as const;

export function StrengthMeter({ value }: { value: string }) {
  const { score, label } = scorePassword(value);
  if (!value) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" role="presentation">
        {[0, 1, 2, 3].map((step) => (
          <span
            key={step}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: step <= score ? TONES[score] : "var(--color-border)",
            }}
          />
        ))}
      </div>
      <span className="w-20 text-right text-xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
