import { Suspense } from "react";
import { DashboardView } from "@/features/dashboard/ui/DashboardView";
import { DashboardSkeleton } from "@/features/dashboard/ui/DashboardSkeleton";
import { loadDashboard } from "@/features/dashboard/server/loadDashboard";

/**
 * PPR: the layout and skeleton are prerendered at build time and served instantly; the per-user
 * part (behind cookies) streams into the Suspense hole from the same response.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

async function DashboardData() {
  return <DashboardView initial={await loadDashboard()} />;
}
