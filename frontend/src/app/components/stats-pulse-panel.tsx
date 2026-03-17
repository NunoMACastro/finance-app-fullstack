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
  budgetDeltaLabel,
  budgetDelta,
  savingsRate,
  budgetUsePercent,
  pulseTone,
  insight,
  insightLoading = false,
}: {
  periodLabel: string;
  totalBalance: string;
  totalIncome: string;
  totalExpense: string;
  budgetDeltaLabel: string;
  budgetDelta: string;
  savingsRate: string;
  budgetUsePercent: number;
  pulseTone: StatsPulseTone;
  insight: string;
  insightLoading?: boolean;
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
      className="space-y-4"
      data-tour="stats-pulse"
    >
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pulse do período</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{periodLabel}</p>
        <p className="mt-3 text-sm text-muted-foreground">Saldo do período</p>
        <p className="mt-1 text-[1.75rem] leading-none tracking-tight text-foreground">{totalBalance}</p>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${toneBarClass(pulseTone)}`}
          style={{ width: `${Math.max(0, Math.min(budgetUsePercent, 100))}%` }}
        />
      </div>

      <div className="divide-y divide-border/60 border-y border-border/60">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-sm text-muted-foreground">Receitas</span>
          <span className="text-sm tabular-nums text-foreground">{totalIncome}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-sm text-muted-foreground">Despesas</span>
          <span className="text-sm tabular-nums text-foreground">{totalExpense}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-sm text-muted-foreground">{budgetDeltaLabel}</span>
          <span className={`text-sm tabular-nums ${toneTextClass(pulseTone)}`}>{budgetDelta}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-sm text-muted-foreground">Taxa de poupança</span>
          <span className="text-sm tabular-nums text-foreground">{savingsRate}</span>
        </div>
      </div>

      <div className={`rounded-xl px-3 py-2 ${toneSoftClass(pulseTone)}`}>
        <p className={`flex items-center gap-2 text-sm ${toneTextClass(pulseTone)}`}>
          <Icon className="h-4 w-4 shrink-0" />
          {insightLoading ? (
            <span className="animate-pulse">A gerar análise IA...</span>
          ) : (
            <span>{insight}</span>
          )}
        </p>
      </div>
    </section>
  );
}
