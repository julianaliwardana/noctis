import { Suspense } from "react";
import { DashboardView } from "@/features/dashboard/ui/DashboardView";
import { DashboardSkeleton } from "@/features/dashboard/ui/DashboardSkeleton";
import { loadDashboard } from "@/features/dashboard/server/loadDashboard";

/** PPR: prerendered shell; per-user data streams in. */
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
