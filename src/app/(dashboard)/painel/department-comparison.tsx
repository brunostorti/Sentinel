"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import type { DepartmentResult } from "@/lib/copsoq/types";

interface DepartmentComparisonProps {
  surveyTitle: string;
  departmentResults: DepartmentResult[];
}

const TRAFFIC_COLORS = {
  GREEN: "bg-green-500",
  YELLOW: "bg-amber-500",
  RED: "bg-red-500",
};

export function DepartmentComparison({
  surveyTitle,
  departmentResults,
}: DepartmentComparisonProps) {
  // Filter departments that have dimension data
  const withData = departmentResults.filter(
    (d) => d.dimensions && d.dimensions.length > 0
  );

  if (withData.length === 0) {
    return null;
  }

  // Collect all unique dimensions
  const allDimensionNames = new Set<string>();
  for (const dept of withData) {
    for (const dim of dept.dimensions ?? []) {
      allDimensionNames.add(dim.name);
    }
  }
  const dimensionNames = Array.from(allDimensionNames);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">
          Comparação por Departamento
        </h2>
        <span className="text-sm text-muted-foreground">{surveyTitle}</span>
      </div>

      {departmentResults.some((d) => d.isAnonymous) && (
        <p className="text-xs text-muted-foreground">
          <Icon name="info" size={14} className="mr-1 inline align-text-bottom" />
          Departamentos com menos de 5 respostas estão ocultos para preservar o
          anonimato.
        </p>
      )}

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Dimensão
                  </th>
                  {withData.map((dept) => (
                    <th
                      key={dept.departmentId}
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {dept.departmentName}
                      <span className="block text-[10px] font-normal normal-case">
                        {dept.responseCount} respostas
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensionNames.map((dimName, i) => (
                  <tr
                    key={dimName}
                    className={i % 2 === 0 ? "" : "bg-muted/20"}
                  >
                    <td className="sticky left-0 z-10 bg-background px-4 py-2.5 text-xs font-medium">
                      {dimName}
                    </td>
                    {withData.map((dept) => {
                      const dim = dept.dimensions?.find(
                        (d) => d.name === dimName
                      );
                      if (!dim) {
                        return (
                          <td
                            key={dept.departmentId}
                            className="px-4 py-2.5 text-center text-xs text-muted-foreground"
                          >
                            —
                          </td>
                        );
                      }
                      return (
                        <td
                          key={dept.departmentId}
                          className="px-4 py-2.5 text-center"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${TRAFFIC_COLORS[dim.trafficLight]}`}
                            />
                            <span className="text-xs font-medium">
                              {Math.round(dim.displayScore)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
