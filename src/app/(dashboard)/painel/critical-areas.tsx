import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/icon";
import type { DimensionScore } from "@/lib/copsoq/types";

interface CriticalAreasProps {
  scores: DimensionScore[];
}

export function CriticalAreas({ scores }: CriticalAreasProps) {
  const critical = [...scores]
    .filter((s) => s.trafficLight === "RED" || s.trafficLight === "YELLOW")
    .sort((a, b) => {
      const order = { RED: 0, YELLOW: 1, GREEN: 2 };
      const levelDiff = order[a.trafficLight] - order[b.trafficLight];
      if (levelDiff !== 0) return levelDiff;
      return a.displayScore - b.displayScore;
    })
    .slice(0, 5);

  if (critical.length === 0) {
    return (
      <Card className="card-hover animate-fade-in-up border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-50/30 dark:border-emerald-800/40 dark:from-emerald-950/40 dark:to-emerald-950/20">
        <CardContent className="flex items-center gap-4 py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/40">
            <Icon name="check_circle" size={26} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">
              Todas as dimensões favoráveis
            </p>
            <p className="mt-0.5 text-sm text-emerald-600/80 dark:text-emerald-400/90">
              Nenhuma dimensão em nível de risco ou intermédio.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover animate-fade-in-up overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Icon name="warning" size={16} className="text-red-500" />
          Áreas que Precisam de Atenção
        </CardTitle>
      </CardHeader>
      <CardContent className="stagger-children space-y-2">
        {critical.map((dim, i) => {
          const isRed = dim.trafficLight === "RED";
          return (
            <div
              key={dim.dimensionId}
              className={`group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:scale-[1.01] ${
                isRed
                  ? "border border-red-200/60 bg-gradient-to-r from-red-50 to-red-50/30 dark:border-red-600/50 dark:bg-none dark:bg-card"
                  : "border border-amber-200/60 bg-gradient-to-r from-amber-50 to-amber-50/30 dark:border-amber-600/50 dark:bg-none dark:bg-card"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black shadow-sm ${
                  isRed
                    ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                    : "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                }`}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{dim.name}</p>
                <p className="text-[11px] text-muted-foreground">{dim.category}</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-black ${
                    isRed ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"
                  }`}
                >
                  {Math.round(dim.displayScore)}
                </p>
                <p
                  className={`text-[10px] font-semibold ${
                    isRed ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400"
                  }`}
                >
                  {isRed ? "Risco" : "Intermédio"}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
