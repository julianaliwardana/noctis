import { formatCurrency } from "@noctis/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { dueLabel, shortDay } from "../lib/finance.lib";
import type { SubscriptionDto, SubscriptionsDto } from "../api/finance.api";

const STATUS: Record<SubscriptionDto["status"], { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  paid: { label: "Paid", variant: "secondary" },
  upcoming: { label: "Upcoming", variant: "outline" },
  due: { label: "Due", variant: "outline" },
  missing: { label: "Not charged", variant: "destructive" },
};

function whenLine(subscription: SubscriptionDto): string {
  if (subscription.status === "paid" && subscription.charge) return `Charged ${shortDay(subscription.charge.date)}`;
  if (subscription.status === "missing") return `Was due ${shortDay(subscription.dueDate)}, ${dueLabel(subscription.daysUntilDue)}`;
  return `${shortDay(subscription.dueDate)}, ${dueLabel(subscription.daysUntilDue)}`;
}

export function SubscriptionsCard({ report }: { report: SubscriptionsDto }) {
  const active = report.subscriptions.filter((subscription) => subscription.active);
  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {active.map((subscription) => {
            const status = STATUS[subscription.status];
            const amount = subscription.charge?.amount ?? subscription.expectedAmount;
            return (
              <li key={subscription.name} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{subscription.name}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    {whenLine(subscription)}
                    {subscription.paymentMethod && ` · ${subscription.paymentMethod}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-[family-name:var(--font-mono)] text-sm">{formatCurrency(amount)}</span>
                  <Badge variant={status.variant}>{subscription.priceChanged ? "Price changed" : status.label}</Badge>
                </div>
              </li>
            );
          })}
        </ul>

        {report.dueSoon.map((due) => (
          <p key={due.paymentMethod} className="border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
            Keep <span className="font-[family-name:var(--font-mono)] text-[var(--color-text)]">{formatCurrency(due.total)}</span>{" "}
            ready in {due.paymentMethod} for {due.names.join(", ")}.
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
