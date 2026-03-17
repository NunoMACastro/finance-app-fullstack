import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import {
  OverlayBody,
  OverlayContent,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "./ui/responsive-overlay";
import { getDriverStatusLabel, type StatsDriver } from "./stats-view-model";

function statusClass(status: StatsDriver["status"]): string {
  if (status === "exceeded") return "text-status-danger";
  if (status === "tight") return "text-status-warning";
  return "text-status-success";
}

function statusSoftClass(status: StatsDriver["status"]): string {
  if (status === "exceeded") return "bg-danger-soft";
  if (status === "tight") return "bg-warning-soft";
  return "bg-success-soft";
}

export function StatsCategoryInsightSheet({
  open,
  onOpenChange,
  driver,
  formatCurrency,
  onOpenMovements,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: StatsDriver | null;
  formatCurrency: (value: number) => string;
  onOpenMovements: () => void;
}) {
  const hasMovements = Boolean(driver && driver.monthlySeries.length > 0);
  const maxSeriesValue = Math.max(
    ...(driver?.monthlySeries.map((item) => Math.max(item.actual, item.budgeted)) ?? [1]),
    1,
  );

  return (
    <ResponsiveOverlay open={open} onOpenChange={onOpenChange}>
      <OverlayContent density="compact">
        <OverlayHeader>
          <OverlayTitle>
            {driver ? `Detalhe · ${driver.categoryName}` : "Detalhe da categoria"}
          </OverlayTitle>
        </OverlayHeader>

        <OverlayBody className="pt-0">
          {!driver ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem categoria selecionada.
            </p>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-2xl px-3 py-2 ${statusSoftClass(driver.status)}`}>
                <p className={`text-sm ${statusClass(driver.status)}`}>
                  Estado: {getDriverStatusLabel(driver.status)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/60 bg-surface-soft px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Gasto</p>
                  <p className="text-sm tabular-nums text-foreground">
                    {formatCurrency(driver.actual)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-surface-soft px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Limite</p>
                  <p className="text-sm tabular-nums text-foreground">
                    {formatCurrency(driver.budgeted)}
                  </p>
                </div>
                <div className="col-span-2 rounded-2xl border border-border/60 bg-surface-soft px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Margem</p>
                  <p className={`text-sm tabular-nums ${statusClass(driver.status)}`}>
                    {driver.budgeted - driver.actual < 0
                      ? `${formatCurrency(Math.abs(driver.budgeted - driver.actual))} excedido`
                      : `${formatCurrency(driver.budgeted - driver.actual)} restante`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Evolução no período</p>
                {driver.monthlySeries.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                    Ainda sem série mensal para esta categoria.
                  </p>
                ) : (
                  <div className="grid grid-cols-6 gap-1.5">
                    {driver.monthlySeries.slice(-6).map((entry) => {
                      const budgetHeight = (entry.budgeted / maxSeriesValue) * 100;
                      const actualHeight = (entry.actual / maxSeriesValue) * 100;
                      return (
                        <div key={entry.month} className="flex flex-col items-center gap-1">
                          <div className="flex h-14 items-end gap-1">
                            <div
                              className="w-2 rounded-sm bg-muted"
                              style={{ height: `${budgetHeight}%` }}
                            />
                            <div
                              className="w-2 rounded-sm bg-primary"
                              style={{ height: `${actualHeight}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.month.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface-soft px-3 py-2">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {driver.status === "exceeded" ? (
                    <TrendingDown className="h-4 w-4 text-status-danger" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-status-success" />
                  )}
                  Toque em “Ver movimentos” para abrir o histórico desta categoria.
                </p>
              </div>
            </div>
          )}
        </OverlayBody>

        <OverlayFooter sticky>
          <Button
            type="button"
            className="rounded-xl border-0 bg-primary text-primary-foreground"
            onClick={onOpenMovements}
            disabled={!driver || !hasMovements}
          >
            Ver movimentos
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </OverlayFooter>
      </OverlayContent>
    </ResponsiveOverlay>
  );
}
