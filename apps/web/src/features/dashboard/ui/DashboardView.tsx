"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, Flame, ListChecks, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@noctis/utils";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AnimatedNumber } from "@/shared/components/AnimatedNumber";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
import { useTasks, type TasksSnapshot } from "@/features/tasks/hooks/useTasks";
import { useHabits, type HabitsSnapshot } from "@/features/habits/hooks/useHabits";
import { useHabitLogs } from "@/features/habits/hooks/useHabitLogs";
import { useFinance, type FinanceSnapshot } from "@/features/finance/hooks/useFinance";
import { monthlyCashflow } from "@/features/finance/lib/finance.lib";
import { useUser, type UserSnapshot } from "@/features/auth/hooks/useUser";
import { cn } from "@/lib/utils";
import type { HabitDto, HabitLogDto } from "@/features/habits/api/habits.api";
import { PageHeader } from "@/shared/components/PageHeader";

/** Everything the dashboard shows, fetched on the server so the first paint is complete. */
export interface DashboardSnapshot {
  tasks: TasksSnapshot;
  habits: HabitsSnapshot;
  finance: FinanceSnapshot;
  user: UserSnapshot;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function lastWeek(): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    return day;
  });
}

function StatTile({
  label,
  value,
  format,
  hint,
  tone,
  Icon,
}: {
  label: string;
  value: number;
  format?: (value: number) => string;
  hint: string;
  tone: string;
  Icon: typeof Flame;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-[calc(var(--radius)+2px)] ring-1 ring-inset ring-current/15"
          style={{ backgroundColor: `color-mix(in oklab, ${tone} 14%, transparent)`, color: tone }}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
          <AnimatedNumber
            value={value}
            format={format}
            className="block truncate font-[family-name:var(--font-mono)] text-lg leading-snug tabular-nums"
            style={{ color: tone }}
          />
          <p className="truncate text-xs text-[var(--color-text-muted)]">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, href, tone }: { title: string; href?: string; tone: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: tone }} />
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-xs text-[var(--color-primary-text)] hover:underline">
          View all
        </Link>
      )}
    </div>
  );
}

function HabitRow({
  habit,
  initialLogs,
  onLog,
}: {
  habit: HabitDto;
  initialLogs?: HabitLogDto[];
  onLog: (id: string) => void;
}) {
  const logs = useHabitLogs(habit.id, initialLogs);
  const week = lastWeek();
  const today = startOfDay(new Date());
  const loggedToday = logs.some((log) => isSameDay(new Date(log.date), today));

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--color-text)]">{habit.name}</p>
        <div className="mt-1 flex items-center gap-1" aria-label={`${habit.streak} day streak`}>
          {week.map((day) => {
            const done = logs.some((log) => isSameDay(new Date(log.date), day));
            return (
              <span
                key={day.toISOString()}
                aria-hidden
                className="h-1.5 w-4 rounded-full"
                style={{ backgroundColor: done ? habit.color : "var(--color-border)" }}
              />
            );
          })}
          <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">{habit.streak}d</span>
        </div>
      </div>
      <Button
        type="button"
        variant={loggedToday ? "ghost" : "outline"}
        size="icon-sm"
        aria-label={loggedToday ? `${habit.name} already logged today` : `Log ${habit.name}`}
        onClick={() => onLog(habit.id)}
        style={loggedToday ? { color: habit.color } : undefined}
      >
        <Check />
      </Button>
    </div>
  );
}

export function DashboardView({ initial }: { initial: DashboardSnapshot | null }) {
  const { tasks, completeTask } = useTasks(initial?.tasks);
  const { habits, logs, serverLogs, logHabit } = useHabits(initial?.habits);
  const { summary, expenses } = useFinance(initial?.finance);
  const { user } = useUser(initial?.user);

  const greetingName = user?.name || user?.email;
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysTasks = tasks.filter((task) => !task.completed && task.dueAt && new Date(task.dueAt) < tomorrow);
  const overdueCount = todaysTasks.filter((task) => new Date(task.dueAt as string) < today).length;

  const todaysHabits = habits.filter((habit) => habit.daysOfWeek.includes(today.getDay()));
  const bestStreak = habits.reduce((best, habit) => Math.max(best, habit.longestStreak), 0);

  const cashflow = monthlyCashflow(expenses);
  const peak = Math.max(...cashflow.map((point) => Math.max(point.income, point.expense)), 1);
  const net = summary?.net ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={greetingName ? `Hi, ${greetingName}` : "Good day"} description={formatDate(new Date())} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Due today"
          value={todaysTasks.length}
          hint={overdueCount > 0 ? `${overdueCount} overdue` : "nothing overdue"}
          tone="var(--color-tasks)"
          Icon={ListChecks}
        />
        <StatTile
          label="Habits today"
          value={todaysHabits.length}
          hint={todaysHabits.length === 0 ? "rest day" : "scheduled"}
          tone="var(--color-habits)"
          Icon={Flame}
        />
        <StatTile
          label="Net this month"
          value={net}
          format={(n) => formatCurrency(Math.round(n))}
          hint={net < 0 ? "spending over income" : "income over spending"}
          tone={net < 0 ? "var(--chart-expense)" : "var(--chart-income)"}
          Icon={net < 0 ? TrendingDown : TrendingUp}
        />
        <StatTile
          label="Best streak"
          value={bestStreak}
          format={(n) => `${Math.round(n)}d`}
          hint={bestStreak === 0 ? "log one to start" : "personal record"}
          tone="var(--color-primary-text)"
          Icon={Flame}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent>
            <SectionHeader title="Today's tasks" href="/tasks" tone="var(--color-tasks)" />
            {todaysTasks.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Clear for today</EmptyTitle>
                  <EmptyDescription>Nothing due — add a task to get started.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="thin-scroll flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout" initial={false}>
                {todaysTasks.map((task) => {
                  const overdue = new Date(task.dueAt as string) < today;
                  return (
                    <motion.button
                      key={task.id}
                      layout
                      exit={{ opacity: 0, x: 32, transition: { type: "spring", stiffness: 300, damping: 30 } }}
                      type="button"
                      onClick={() => completeTask(task.id)}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]/25",
                        overdue && "border-l-2 border-[var(--color-tasks)] pl-1.5 font-medium",
                      )}
                    >
                      <span
                        aria-hidden
                        className="flex size-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-transparent group-hover:border-[var(--color-tasks)] group-hover:text-[var(--color-tasks)]"
                      >
                        <Check className="size-3" />
                      </span>
                      <span className="truncate">{task.title}</span>
                      {overdue && (
                        <span className="ml-auto shrink-0 text-xs text-[var(--color-tasks)]">overdue</span>
                      )}
                    </motion.button>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionHeader title="Habit streaks" href="/habits" tone="var(--color-habits)" />
            {todaysHabits.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>{habits.length === 0 ? "No habits yet" : "Rest day"}</EmptyTitle>
                  <EmptyDescription>
                    {habits.length === 0
                      ? "Add a habit and log it once a day to build a streak."
                      : "Nothing scheduled for today — enjoy it."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="thin-scroll flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                {todaysHabits.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    initialLogs={serverLogs ? (logs[habit.id] ?? []) : undefined}
                    onLog={logHabit}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent>
            <SectionHeader title="This month" href="/finance" tone="var(--color-finance)" />
            {summary === null ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No transactions yet</EmptyTitle>
                  <EmptyDescription>Record income or an expense to see your cashflow.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Income", value: summary.income, tone: "var(--chart-income)" },
                    { label: "Expenses", value: summary.expense, tone: "var(--chart-expense)" },
                    { label: "Net", value: summary.net, tone: "var(--color-text)" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-[var(--color-text-muted)]">{item.label}</p>
                      <p
                        className="truncate font-[family-name:var(--font-mono)] text-sm"
                        style={{ color: item.tone }}
                      >
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Six-month sparkline — a pair of bars per month, scaled to the tallest. */}
                <div className="flex items-end gap-2">
                  {cashflow.map((point) => (
                    <div key={point.label} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex h-16 w-full items-end justify-center gap-0.5">
                        <span
                          className="w-1/3 rounded-t-sm bg-[var(--chart-income)]"
                          style={{ height: `${Math.max((point.income / peak) * 100, 2)}%` }}
                          title={`${point.label} income ${formatCurrency(point.income)}`}
                        />
                        <span
                          className="w-1/3 rounded-t-sm bg-[var(--chart-expense)]"
                          style={{ height: `${Math.max((point.expense / peak) * 100, 2)}%` }}
                          title={`${point.label} expenses ${formatCurrency(point.expense)}`}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">{point.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col justify-between gap-4">
            <div>
              <SectionHeader title="Focus session" tone="var(--color-primary-text)" />
              <p className="text-sm text-[var(--color-text-muted)]">
                Start a Pomodoro when you&apos;re ready to focus.
              </p>
            </div>
            <Link href="/pomodoro" className="w-full">
              <Button type="button" className="w-full">
                <Timer />
                Start focus session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
