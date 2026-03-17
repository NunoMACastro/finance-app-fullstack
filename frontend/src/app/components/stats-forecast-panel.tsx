import { Sparkles } from "lucide-react";
import type { StatsSnapshot } from "../lib/types";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";

function confidenceLabel(forecast: StatsSnapshot["forecast"]): string {
  if (forecast.confidence === "high") {
    return `Confiança alta: ${forecast.sampleSize} meses de dados usados.`;
  }
  if (forecast.confidence === "medium") {
    return `Confiança média: dados limitados (${forecast.sampleSize}/${forecast.windowMonths} meses).`;
  }
  return `Confiança baixa: poucos dados disponíveis (${forecast.sampleSize} meses).`;
}

export function StatsForecastPanel({
  forecast,
  forecastWindow,
  onForecastWindowChange,
  formatCurrency,
}: {
  forecast: StatsSnapshot["forecast"];
  forecastWindow: 3 | 6;
  onForecastWindowChange: (window: 3 | 6) => void;
  formatCurrency: (value: number) => string;
}) {
  const windowOptions = [
    { value: 3 as const, label: "3M" },
    { value: 6 as const, label: "6M" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm text-foreground">Projeção</h3>
            <p className="text-[11px] text-muted-foreground">
              Média móvel dos últimos {forecast.windowMonths} meses.
            </p>
          </div>
        </div>

        <SegmentedControlV3
          value={forecastWindow}
          onChange={onForecastWindowChange}
          options={windowOptions}
          size="compact"
          ariaLabel="Selecionar janela da projeção"
        />
      </div>

      <div className="divide-y divide-border/60 border-y border-border/60">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <p className="text-sm text-muted-foreground">Receitas projetadas</p>
          <p className="text-sm tabular-nums text-foreground">{formatCurrency(forecast.projectedIncome)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <p className="text-sm text-muted-foreground">Despesas projetadas</p>
          <p className="text-sm tabular-nums text-foreground">{formatCurrency(forecast.projectedExpense)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <p className="text-sm text-muted-foreground">Saldo projetado</p>
          <p
            className={`text-sm tabular-nums ${
              forecast.projectedBalance >= 0 ? "text-foreground" : "text-status-danger"
            }`}
          >
            {formatCurrency(forecast.projectedBalance)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{confidenceLabel(forecast)}</p>
    </section>
  );
}
