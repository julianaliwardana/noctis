"use client";

import Link from "next/link";
import { formatDate } from "@noctis/utils";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
import { useTasks } from "@/features/tasks/hooks/useTasks";
import { useUser } from "@/features/auth/hooks/useUser";

export default function DashboardPage() {
  const { tasks, completeTask } = useTasks();
  const { user } = useUser();
  const greetingName = user?.name || user?.email;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysTasks = tasks.filter((task) => {
    if (task.completed || !task.dueAt) return false;
    return new Date(task.dueAt) < tomorrow;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">
          {greetingName ? `Hi, ${greetingName}` : "Good day"}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">{formatDate(new Date())}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 xl:col-span-1">
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--color-text)]">Today&apos;s tasks</h2>
              <Link href="/tasks" className="text-xs text-[var(--color-primary)]">
                View all
              </Link>
            </div>
            {todaysTasks.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Clear for today</EmptyTitle>
                  <EmptyDescription>Nothing due — add a task to get started.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {todaysTasks.map((task) => {
                  const overdue = task.dueAt !== null && new Date(task.dueAt) < today;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => completeTask(task.id)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]/20 ${
                        overdue ? "border-l-2 border-[var(--color-tasks)] pl-1.5 font-medium" : ""
                      }`}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-tasks)]" aria-hidden />
                      {task.title}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--color-text)]">Habit streaks</h2>
              <Link href="/habits" className="text-xs text-[var(--color-primary)]">
                View all
              </Link>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Habits coming soon</EmptyTitle>
                <EmptyDescription>Today&apos;s streaks will show here once the habits module is connected.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--color-text)]">This month</h2>
              <Link href="/finance" className="text-xs text-[var(--color-primary)]">
                View all
              </Link>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Finance coming soon</EmptyTitle>
                <EmptyDescription>Spend vs. budget will appear here once the finance module is connected.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-3 text-sm font-medium text-[var(--color-text)]">Latest nudge</h2>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No nudges yet</EmptyTitle>
                <EmptyDescription>Proactive nudges from your assistant will show up here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>

        <Card className="flex flex-col items-start justify-between gap-3">
          <CardContent className="flex w-full flex-1 flex-col items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-text)]">Focus session</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Start a Pomodoro when you&apos;re ready to focus.
              </p>
            </div>
            <Link href="/pomodoro">
              <Button type="button">Start focus session</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
