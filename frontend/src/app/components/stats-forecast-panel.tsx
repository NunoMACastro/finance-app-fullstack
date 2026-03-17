import { Sparkles } from "lucide-react";
import type { StatsSnapshot } from "../lib/types";

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
  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-info-soft">
            <Sparkles className="h-4 w-4 text-status-info" />
          </div>
          <div>
            <h3 className="text-sm text-foreground">Projeção</h3>
            <p className="text-xs text-muted-foreground">
              Média móvel dos últimos {forecast.windowMonths} meses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            className={`h-8 rounded-lg px-2 text-xs ${
              forecastWindow === 3 ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => onForecastWindowChange(3)}
          >
            3M
          </button>
          <button
            type="button"
            className={`h-8 rounded-lg px-2 text-xs ${
              forecastWindow === 6 ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => onForecastWindowChange(6)}
          >
            6M
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="rounded-2xl border border-border/60 bg-surface-soft px-3 py-2">
          <p className="text-xs text-muted-foreground">Receitas projetadas</p>
          <p className="mt-0.5 text-sm tabular-nums text-foreground">
            {formatCurrency(forecast.projectedIncome)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface-soft px-3 py-2">
          <p className="text-xs text-muted-foreground">Despesas projetadas</p>
          <p className="mt-0.5 text-sm tabular-nums text-foreground">
            {formatCurrency(forecast.projectedExpense)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-surface-soft px-3 py-2">
          <p className="text-xs text-muted-foreground">Saldo projetado</p>
          <p
            className={`mt-0.5 text-sm tabular-nums ${
              forecast.projectedBalance >= 0 ? "text-foreground" : "text-status-danger"
            }`}
          >
            {formatCurrency(forecast.projectedBalance)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{confidenceLabel(forecast)}</p>
    </section>
  );
}
