import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Mirrors FinanceView's blocks and mobile ordering, so the stream-in doesn't shift the page. */
export function FinanceSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3" aria-busy="true" aria-label="Loading finance">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="order-3 md:order-none">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
      <div className="order-2 md:order-none">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="order-4 flex flex-col gap-2 md:order-none">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </>
  );
}
