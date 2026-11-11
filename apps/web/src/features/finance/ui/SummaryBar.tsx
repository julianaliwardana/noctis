"use client";

import { useState } from "react";
import { ArrowUpRight, Pencil, PiggyBank, Wallet } from "lucide-react";
import { formatCurrency } from "@noctis/utils";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { ApiError } from "@/lib/api";
import { parseRupiah } from "../lib/finance.lib";
import type { OverviewDto } from "../api/finance.api";

export interface SummaryBarProps {
  overview: OverviewDto;
  onSetIncome: (monthlyIncome: number | null) => Promise<void>;
}

function IncomeEditor({ income, onSave }: { income: number | null; onSave: SummaryBarProps["onSetIncome"] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(value: number | null): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await onSave(value);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

  function submit(): void {
    const value = parseRupiah(draft);
    if (value === null) setError("Enter an amount in rupiah");
    else void save(value);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(income === null ? "" : String(income));
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        {income === null ? (
          <Button type="button" variant="outline" size="sm">
            Set monthly income
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Change monthly income"
            className="text-[var(--color-text-muted)]"
          >
            <Pencil />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="monthly-income" className="text-sm font-medium">
            Monthly income
          </label>
          <Input
            id="monthly-income"
            inputMode="numeric"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="13.000.000"
            aria-invalid={error !== null}
            disabled={busy}
          />
          <p className="text-xs text-[var(--color-text-muted)]">Take-home pay. What is left is this minus what you spent.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            {income !== null && (
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void save(null)}>
                Clear
              </Button>
            )}
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function Tile({
  label,
  color,
  Icon,
  children,
  action,
}: {
  label: string;
  color: string;
  Icon: typeof Wallet;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
          {children}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

const READOUT = "truncate font-[family-name:var(--font-mono)] text-lg";

export function SummaryBar({ overview, onSetIncome }: SummaryBarProps) {
  const { spent, walletTopUps, remaining, perDayLeft, daysLeft, monthlyIncome } = overview;
  const overspent = remaining !== null && remaining < 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Tile label="Spent this month" color="var(--chart-expense)" Icon={ArrowUpRight}>
        <p className={READOUT} style={{ color: "var(--chart-expense)" }}>
          {formatCurrency(spent)}
        </p>
      </Tile>

      <Tile label="Wallet top-ups" color="var(--color-text-muted)" Icon={Wallet}>
        <p className={READOUT}>{formatCurrency(walletTopUps)}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">Not counted as spend</p>
      </Tile>

      <Tile
        label="Left this month"
        color={overspent ? "var(--chart-expense)" : "var(--color-finance)"}
        Icon={PiggyBank}
        action={<IncomeEditor income={monthlyIncome} onSave={onSetIncome} />}
      >
        {remaining === null ? (
          <p className="text-sm text-[var(--color-text-muted)]">Needs your income</p>
        ) : (
          <>
            <p className={READOUT} style={{ color: overspent ? "var(--chart-expense)" : undefined }}>
              {formatCurrency(remaining)}
            </p>
            {perDayLeft !== null && !overspent && (
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {formatCurrency(perDayLeft)} a day for {daysLeft} {daysLeft === 1 ? "day" : "days"}
              </p>
            )}
          </>
        )}
      </Tile>
    </div>
  );
}
