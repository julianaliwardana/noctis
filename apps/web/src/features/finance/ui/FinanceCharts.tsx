"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@noctis/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart";
import { categoryTotals, colorFor, monthlyCashflow } from "../lib/finance.lib";
import type { CategoryDto, ExpenseDto } from "../api/finance.api";

const cashflowConfig = {
  income: { label: "Income", color: "var(--chart-income)" },
  expense: { label: "Expense", color: "var(--chart-expense)" },
} satisfies ChartConfig;

/** Pie centre is pinned so the HTML total below can sit on top of it. */
const PIE_CY = 78;

function compact(value: number): string {
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function FinanceCharts({ categories, expenses }: { categories: CategoryDto[]; expenses: ExpenseDto[] }) {
  const cashflow = useMemo(() => monthlyCashflow(expenses), [expenses]);
  // Colours come from the category record, so they survive deleting the last transaction in one.
  const slices = useMemo(
    () =>
      categoryTotals(expenses).map((slice) => ({
        ...slice,
        fill: colorFor(categories, slice.category),
      })),
    [categories, expenses],
  );

  const spend = slices.reduce((sum, slice) => sum + slice.total, 0);
  const sliceConfig: ChartConfig = Object.fromEntries(
    slices.map((slice) => [slice.category, { label: slice.category, color: slice.fill }]),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Cashflow</CardTitle>
          <CardDescription>Income against expenses, last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={cashflowConfig} className="h-56 w-full">
            <BarChart data={cashflow} barGap={2} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Where it goes</CardTitle>
          <CardDescription>Spend by category, all time.</CardDescription>
        </CardHeader>
        <CardContent>
          {slices.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No expenses recorded yet.</p>
          ) : (
            <div className="relative">
              <ChartContainer config={sliceConfig} className="h-56 w-full">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent nameKey="category" formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  <Pie
                    data={slices}
                    dataKey="total"
                    nameKey="category"
                    cy={PIE_CY}
                    innerRadius={52}
                    outerRadius={78}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <ChartLegend content={<ChartLegendContent nameKey="category" className="flex-wrap" />} />
                </PieChart>
              </ChartContainer>
              {/* Centred over the pinned pie centre — recharts' own <Label> renders nothing in v3. */}
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ top: PIE_CY }}
              >
                <p className="font-[family-name:var(--font-mono)] text-base text-[var(--color-text)]">
                  {compact(spend)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">total spend</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
