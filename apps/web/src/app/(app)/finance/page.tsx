import { Suspense } from "react";
import { FinanceView } from "@/features/finance/ui/FinanceView";
import { FinanceSkeleton } from "@/features/finance/ui/FinanceSkeleton";
import { loadFinance } from "@/features/finance/server/loadFinance";
import { PageHeader } from "@/shared/components/PageHeader";

/** PPR: heading + skeleton in the prerendered shell, the user's numbers stream in. */
export default function FinancePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Finance" description="This month's income, expenses, and net." />
      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceData />
      </Suspense>
    </div>
  );
}

async function FinanceData() {
  return <FinanceView initial={await loadFinance()} />;
}
