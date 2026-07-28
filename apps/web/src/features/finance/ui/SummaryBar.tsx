import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { formatCurrency } from "@noctis/utils";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { MonthlySummary } from "../api/finance.api";

export function SummaryBar({ summary }: { summary: MonthlySummary }) {
  const tiles = [
    { label: "Income", value: summary.income, color: "var(--chart-income)", Icon: ArrowDownLeft },
    { label: "Expenses", value: summary.expense, color: "var(--chart-expense)", Icon: ArrowUpRight },
    { label: "Net", value: summary.net, color: summary.net < 0 ? "var(--chart-expense)" : "var(--color-text)", Icon: Wallet },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tiles.map(({ label, value, color, Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
            >
              <Icon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[var(--color-text-muted)]">{label} this month</p>
              <p className="truncate font-[family-name:var(--font-mono)] text-lg" style={{ color }}>
                {formatCurrency(value)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
