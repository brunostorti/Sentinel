import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PesquisasLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
