import { Suspense } from "react";
import { FinanceView } from "@/features/finance/ui/FinanceView";
import { FinanceSkeleton } from "@/features/finance/ui/FinanceSkeleton";
import { loadFinance } from "@/features/finance/server/loadFinance";
import { PageHeader } from "@/shared/components/PageHeader";
import { AmountsToggle } from "@/shared/components/AmountsToggle";

/** PPR: heading + skeleton in the prerendered shell, the user's numbers stream in. */
export default function FinancePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Finance" description="Spending, budgets, and what is left of your income." actions={<AmountsToggle />} />
      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceData />
      </Suspense>
    </div>
  );
}

async function FinanceData() {
  return <FinanceView initial={await loadFinance()} />;
}
