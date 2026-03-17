import { ChevronRight } from "lucide-react";
import {
  getDriverStatusLabel,
  type StatsDriver,
  type StatsDriverStatus,
} from "./stats-view-model";

function statusTextClass(status: StatsDriverStatus): string {
  if (status === "exceeded") return "text-status-danger";
  if (status === "tight") return "text-status-warning";
  return "text-status-success";
}

function statusSoftClass(status: StatsDriverStatus): string {
  if (status === "exceeded") return "bg-danger-soft";
  if (status === "tight") return "bg-warning-soft";
  return "bg-success-soft";
}

function statusBarClass(status: StatsDriverStatus): string {
  if (status === "exceeded") return "bg-danger-gradient";
  if (status === "tight") return "bg-warning";
  return "bg-primary";
}

export function StatsDriversList({
  drivers,
  formatCurrency,
  onSelectDriver,
}: {
  drivers: StatsDriver[];
  formatCurrency: (value: number) => string;
  onSelectDriver: (driver: StatsDriver) => void;
}) {
  return (
    <section
      className="rounded-2xl border border-border/70 bg-card/70 p-4"
      data-tour="stats-drivers"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm text-foreground">Drivers do período</h3>
          <p className="text-xs text-muted-foreground">
            As 3 categorias com maior impacto no resultado.
          </p>
        </div>
      </div>

      {drivers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          Ainda sem categorias com dados para análise.
        </p>
      ) : (
        <div className="divide-y divide-border/60 border-y border-border/60">
          {drivers.map((driver) => {
            const remaining = driver.budgeted - driver.actual;
            const barWidth = Math.max(0, Math.min(driver.usedPercent, 100));
            return (
              <button
                key={driver.categoryId}
                type="button"
                className="w-full py-3 text-left"
                onClick={() => onSelectDriver(driver)}
                data-testid={`stats-driver-row-${driver.categoryId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{driver.categoryName}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ${statusSoftClass(
                        driver.status,
                      )} ${statusTextClass(driver.status)}`}
                    >
                      {getDriverStatusLabel(driver.status)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tabular-nums text-foreground">
                      {formatCurrency(driver.actual)} / {formatCurrency(driver.budgeted)}
                    </p>
                    <p className={`text-xs tabular-nums ${statusTextClass(driver.status)}`}>
                      {remaining < 0
                        ? `${formatCurrency(Math.abs(remaining))} excedido`
                        : `${formatCurrency(remaining)} restante`}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${statusBarClass(driver.status)}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
