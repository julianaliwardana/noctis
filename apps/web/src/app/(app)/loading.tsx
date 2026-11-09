import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Suspense boundary for every page in the app group. Several client pages read `new Date()`
 * while rendering (streaks, due dates), which Cache Components won't bake into a build-time
 * prerender; behind this boundary they render per request and this skeleton is the shell.
 * Dashboard and finance have their own, more detailed skeletons further down.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
