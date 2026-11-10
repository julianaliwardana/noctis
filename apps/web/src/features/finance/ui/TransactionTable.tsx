"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Trash2 } from "lucide-react";
import { formatCurrency } from "@noctis/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { useAppearance } from "@/lib/appearanceStore";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { categoryNames, colorFor, queryExpenses, sumSigned, type SortKey } from "../lib/finance.lib";
import type { CategoryDto, ExpenseDto } from "../api/finance.api";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "date", label: "Date" },
  { key: "title", label: "Description" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount", className: "text-right" },
];

export interface TransactionTableProps {
  categories: CategoryDto[];
  expenses: ExpenseDto[];
  onDelete: (id: string) => void;
}

export function TransactionTable({ categories, expenses, onDelete }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  // Rows per page is an Appearance setting (Profile → Appearance → Rows per page).
  const pageSize = Number(useAppearance().pageSize);

  const names = useMemo(() => categoryNames(categories, expenses), [categories, expenses]);
  const rows = useMemo(
    () => queryExpenses(expenses, { search, category, type, sort, dir }),
    [expenses, search, category, type, sort, dir],
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);
  const first = rows.length === 0 ? 0 : current * pageSize + 1;
  const last = Math.min(rows.length, (current + 1) * pageSize);

  function toggleSort(key: SortKey): void {
    if (key === sort) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "amount" || key === "date" ? "desc" : "asc");
    }
    setPage(0);
  }

  function reset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>Transactions</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input
              value={search}
              onChange={(event) => reset(setSearch)(event.target.value)}
              placeholder="Search description or category…"
              aria-label="Search transactions"
              className="pl-8"
            />
          </div>
          <Select value={category} onValueChange={reset(setCategory)}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {names.map((name) => (
                <SelectItem key={name} value={name}>
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: colorFor(categories, name) }}
                  />
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={reset(setType)}>
            <SelectTrigger className="w-full sm:w-32" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => {
                const active = sort === column.key;
                const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <TableHead
                    key={column.key}
                    className={column.className}
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-label={`Sort by ${column.label}`}
                      className={cn(
                        "press -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 uppercase outline-none hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-[0.96]",
                        active && "text-[var(--color-primary-text)]",
                      )}
                    >
                      {column.label}
                      <Icon className={cn("size-3.5", !active && "opacity-40")} />
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[var(--color-text-muted)]">
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((expense) => (
                <TableRow key={expense.id} className="group">
                  <TableCell className="text-[var(--color-text-muted)]">
                    {format(new Date(expense.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate font-medium">{expense.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="gap-1.5 text-[var(--color-text)]"
                      style={{ backgroundColor: `color-mix(in srgb, ${colorFor(categories, expense.category)} 14%, transparent)` }}
                    >
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ backgroundColor: colorFor(categories, expense.category) }}
                      />
                      {expense.category}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-right font-[family-name:var(--font-mono)]"
                    style={{ color: expense.type === "income" ? "var(--chart-income)" : undefined }}
                  >
                    {expense.type === "income" ? "+" : "−"}
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(expense.id)}
                      aria-label={`Delete ${expense.title}`}
                      className="text-[var(--color-text-muted)] opacity-0 focus-visible:opacity-100 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>

          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Net of {rows.length} filtered</TableCell>
                <TableCell className="text-right font-[family-name:var(--font-mono)]">
                  {formatCurrency(sumSigned(rows))}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>

        {rows.length > 0 && (
          <Pagination
            className="mt-5 border-t border-[var(--color-border)] pt-4"
            page={current}
            pageCount={pageCount}
            onPageChange={setPage}
            summary={`${first}–${last} of ${rows.length}`}
          />
        )}
      </CardContent>
    </Card>
  );
}
