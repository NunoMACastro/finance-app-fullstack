import { AlertTriangle, CheckCircle2, Info, TrendingUp } from "lucide-react";
import type { StatsPulseTone } from "./stats-view-model";

function toneTextClass(tone: StatsPulseTone): string {
  if (tone === "success") return "text-status-success";
  if (tone === "warning") return "text-status-warning";
  if (tone === "danger") return "text-status-danger";
  return "text-muted-foreground";
}

function toneSoftClass(tone: StatsPulseTone): string {
  if (tone === "success") return "bg-success-soft";
  if (tone === "warning") return "bg-warning-soft";
  if (tone === "danger") return "bg-danger-soft";
  return "bg-surface-soft";
}

function toneBarClass(tone: StatsPulseTone): string {
  if (tone === "success") return "bg-success";
  if (tone === "warning") return "bg-warning";
  if (tone === "danger") return "bg-danger";
  return "bg-primary";
}

export function StatsPulsePanel({
  periodLabel,
  totalBalance,
  totalIncome,
  totalExpense,
  budgetDelta,
  savingsRate,
  budgetUsePercent,
  pulseTone,
  insight,
}: {
  periodLabel: string;
  totalBalance: string;
  totalIncome: string;
  totalExpense: string;
  budgetDelta: string;
  savingsRate: string;
  budgetUsePercent: number;
  pulseTone: StatsPulseTone;
  insight: string;
}) {
  const Icon =
    pulseTone === "danger"
      ? AlertTriangle
      : pulseTone === "success"
        ? CheckCircle2
        : pulseTone === "warning"
          ? TrendingUp
          : Info;

  return (
    <section
      className="rounded-2xl border border-border/70 bg-surface-soft/50 p-4"
      data-tour="stats-pulse"
    >
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pulse do período</p>
        <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
        <p className="mt-3 text-sm text-muted-foreground">Saldo do período</p>
        <p className="mt-1 text-4xl leading-none tracking-tight text-foreground">{totalBalance}</p>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${toneBarClass(pulseTone)}`}
          style={{ width: `${Math.max(0, Math.min(budgetUsePercent, 100))}%` }}
        />
      </div>

      <p className="mt-3 text-center text-sm text-foreground">
        Receitas <span className="font-semibold">{totalIncome}</span> · Despesas{" "}
        <span className="font-semibold">{totalExpense}</span> · Desvio{" "}
        <span className={`font-semibold ${toneTextClass(pulseTone)}`}>{budgetDelta}</span> · Poupança{" "}
        <span className="font-semibold">{savingsRate}</span>
      </p>

      <div className={`mt-4 rounded-2xl px-3 py-2 ${toneSoftClass(pulseTone)}`}>
        <p className={`flex items-center gap-2 text-sm ${toneTextClass(pulseTone)}`}>
          <Icon className="h-4 w-4 shrink-0" />
          <span>{insight}</span>
        </p>
      </div>
    </section>
  );
}
