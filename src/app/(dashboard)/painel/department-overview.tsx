import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";

interface Department {
  id: string;
  name: string;
}

interface DeptStats {
  invited: number;
  responded: number;
  responses: number;
}

interface DepartmentOverviewProps {
  departments: Department[];
  responseCounts: Record<string, DeptStats>;
}

export function DepartmentOverview({
  departments,
  responseCounts,
}: DepartmentOverviewProps) {
  if (departments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black tracking-tight">
        Participação por Departamento
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const stats = responseCounts[dept.id] ?? {
            invited: 0,
            responded: 0,
            responses: 0,
          };
          const rate =
            stats.invited > 0
              ? Math.round((stats.responded / stats.invited) * 100)
              : 0;

          return (
            <Card key={dept.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <Icon
                    name="apartment"
                    size={18}
                    className="text-muted-foreground"
                  />
                  {dept.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      {stats.responded} de {stats.invited} responderam
                    </span>
                    <span className="font-medium">{rate}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
