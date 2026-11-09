import { Suspense } from "react";
import { FinanceView } from "@/features/finance/ui/FinanceView";
import { FinanceSkeleton } from "@/features/finance/ui/FinanceSkeleton";
import { loadFinance } from "@/features/finance/server/loadFinance";

/** PPR: heading + skeleton in the prerendered shell, the user's numbers stream in. */
export default function FinancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Finance</h1>
        <p className="text-sm text-[var(--color-text-muted)]">This month&apos;s income, expenses, and net.</p>
      </div>
      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceData />
      </Suspense>
    </div>
  );
}

async function FinanceData() {
  return <FinanceView initial={await loadFinance()} />;
}
