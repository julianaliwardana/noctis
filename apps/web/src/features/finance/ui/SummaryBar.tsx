"use client";

import { useState } from "react";
import { ArrowUpRight, Banknote, Pencil, PiggyBank, Wallet } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { ApiError } from "@/lib/api";
import { useAmountsHidden, useMoney } from "@/lib/amountsPrivacy";
import { parseRupiah, shortDay } from "../lib/finance.lib";
import type { IncomeSettings, OverviewDto } from "../api/finance.api";

export interface SummaryBarProps {
  overview: OverviewDto;
  onSetIncome: (settings: IncomeSettings) => Promise<void>;
  onLogSalary: (amount: number, date?: string) => Promise<void>;
}

/** Popover forms here share one shape: run the save, show the server's reason if it refuses. */
function useSave(onDone: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Couldn't save that");
    } finally {
      setBusy(false);
    }
  }

  return { error, setError, busy, run };
}

function IncomeEditor({
  income,
  payday,
  onSave,
}: {
  income: number | null;
  payday: number | null;
  onSave: SummaryBarProps["onSetIncome"];
}) {
  const [open, setOpen] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState("");
  const [paydayDraft, setPaydayDraft] = useState("");
  const hidden = useAmountsHidden();
  const { error, setError, busy, run } = useSave(() => setOpen(false));

  function submit(): void {
    const settings: IncomeSettings = {};

    const incomeText = incomeDraft.trim();
    if (incomeText === "") {
      // While amounts are hidden the field opens empty, so empty there means "leave it", not "clear it".
      if (!hidden) settings.monthlyIncome = null;
    } else {
      const value = parseRupiah(incomeText);
      if (value === null) return setError("Enter the income in rupiah");
      settings.monthlyIncome = value;
    }

    const paydayText = paydayDraft.trim();
    if (paydayText === "") settings.payday = null;
    else {
      const day = Number(paydayText);
      if (!Number.isInteger(day) || day < 1 || day > 31) return setError("Payday is a day of the month, 1 to 31");
      settings.payday = day;
    }

    void run(() => onSave(settings));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setIncomeDraft(income === null || hidden ? "" : String(income));
          setPaydayDraft(payday === null ? "" : String(payday));
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        {income === null ? (
          <Button type="button" variant="outline" size="sm">
            Set income
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Income and payday" className="text-[var(--color-text-muted)]">
            <Pencil />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="monthly-income" className="text-sm font-medium">
            Usual monthly income
          </label>
          <Input
            id="monthly-income"
            inputMode="numeric"
            autoFocus
            value={incomeDraft}
            onChange={(event) => setIncomeDraft(event.target.value)}
            placeholder={hidden && income !== null ? "Unchanged" : "13.000.000"}
            disabled={busy}
          />
          <label htmlFor="payday" className="mt-1 text-sm font-medium">
            Payday
          </label>
          <Input
            id="payday"
            inputMode="numeric"
            value={paydayDraft}
            onChange={(event) => setPaydayDraft(event.target.value)}
            placeholder="Day of the month, e.g. 27"
            disabled={busy}
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            With a payday, budgets run from one salary to the next instead of by calendar month. A late salary just makes the
            cycle longer. Leave it empty for calendar months.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function SalaryLogger({
  usual,
  prominent,
  onLog,
}: {
  usual: number | null;
  /** Payday is close or past: show it as a labelled button rather than an icon. */
  prominent: boolean;
  onLog: SummaryBarProps["onLogSalary"];
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const hidden = useAmountsHidden();
  const { error, setError, busy, run } = useSave(() => setOpen(false));

  function submit(): void {
    const value = parseRupiah(amount);
    if (value === null) return setError("Enter the amount you received");
    if (date === "") return setError("Pick the day it arrived");
    // Noon in Jakarta: the day stays the day the user picked, whatever this browser's timezone.
    void run(() => onLog(value, `${date}T12:00:00+07:00`));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAmount(usual === null || hidden ? "" : String(usual));
          setDate(format(new Date(), "yyyy-MM-dd"));
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        {prominent ? (
          <Button type="button" size="sm">
            <Banknote />
            Salary in
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Log salary" className="text-[var(--color-text-muted)]">
            <Banknote />
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
          <p className="text-sm font-medium">Salary arrived</p>
          <Input
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Amount received"
            aria-label="Amount received"
            disabled={busy}
          />
          <Input
            type="date"
            value={date}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Day it arrived"
            disabled={busy}
          />
          <p className="text-xs text-[var(--color-text-muted)]">Starts a new pay cycle from that day.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
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
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </CardContent>
    </Card>
  );
}

const READOUT = "truncate font-[family-name:var(--font-mono)] text-lg";
const NOTE = "truncate text-xs text-[var(--color-text-muted)]";

/** How long before the expected payday the salary button gets a label. */
const SALARY_SOON_DAYS = 3;

export function SummaryBar({ overview, onSetIncome, onLogSalary }: SummaryBarProps) {
  const { spent, walletTopUps, remaining, perDayLeft, daysLeft, period } = overview;
  const overspent = remaining !== null && remaining < 0;
  const money = useMoney();
  const cycle = period.mode === "payday";
  const since = shortDay(period.start);

  let note: React.ReactNode = null;
  if (cycle && period.salaryDue) {
    note = period.daysLate === 0 ? "Payday today: log your salary" : `Salary ${period.daysLate} ${period.daysLate === 1 ? "day" : "days"} late`;
  } else if (perDayLeft !== null && !overspent) {
    note = cycle && period.expectedNext
      ? `${money(perDayLeft)} a day until ${shortDay(period.expectedNext)}`
      : `${money(perDayLeft)} a day for ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Tile label={cycle ? `Spent since ${since}` : "Spent this month"} color="var(--chart-expense)" Icon={ArrowUpRight}>
        <p className={READOUT} style={{ color: "var(--chart-expense)" }}>
          {money(spent)}
        </p>
        {cycle && <p className={NOTE}>This pay cycle</p>}
      </Tile>

      <Tile label="Wallet top-ups" color="var(--color-text-muted)" Icon={Wallet}>
        <p className={READOUT}>{money(walletTopUps)}</p>
        <p className={NOTE}>Not counted as spend</p>
      </Tile>

      <Tile
        label="Left of income"
        color={overspent ? "var(--chart-expense)" : "var(--color-finance)"}
        Icon={PiggyBank}
        action={
          <>
            {cycle && (
              <SalaryLogger
                usual={period.usualIncome}
                prominent={period.salaryDue || daysLeft <= SALARY_SOON_DAYS}
                onLog={onLogSalary}
              />
            )}
            <IncomeEditor income={period.usualIncome} payday={period.payday} onSave={onSetIncome} />
          </>
        }
      >
        {remaining === null ? (
          <p className="text-sm text-[var(--color-text-muted)]">Needs your income</p>
        ) : (
          <p className={READOUT} style={{ color: overspent ? "var(--chart-expense)" : undefined }}>
            {money(remaining)}
          </p>
        )}
        {remaining !== null && note && <p className={NOTE}>{note}</p>}
      </Tile>
    </div>
  );
}
