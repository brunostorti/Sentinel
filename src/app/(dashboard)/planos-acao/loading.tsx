import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PlanosAcaoLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-60" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute left-0 right-0 top-0 h-1">
              <Skeleton className="h-full w-full" />
            </div>
            <CardContent className="pb-4 pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-8 w-12" />
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="flex items-center gap-3 py-3">
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-5 w-px" />
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1.5">
              <Skeleton className="h-full w-full" />
            </div>
            <CardContent className="flex gap-4 p-4 pl-5">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
