import { ChevronRight } from "lucide-react";

type ExpenseCategoryTone = "normal" | "warning" | "danger";

type MonthExpenseCategoryRowProps = {
  name: string;
  percentLabel: string;
  spentLabel: string;
  allocatedLabel: string;
  remainingLabel: string;
  movementsLabel: string;
  progressPercent: number;
  tone: ExpenseCategoryTone;
  dotClassName: string;
  onOpen: () => void;
};

function getToneTextClass(tone: ExpenseCategoryTone): string {
  if (tone === "danger") return "text-status-danger";
  if (tone === "warning") return "text-status-warning";
  return "text-foreground";
}

function getToneBarClass(tone: ExpenseCategoryTone): string {
  if (tone === "danger") return "bg-status-danger";
  if (tone === "warning") return "bg-status-warning";
  return "bg-primary";
}

export function MonthExpenseCategoryRow({
  name,
  percentLabel,
  spentLabel,
  allocatedLabel,
  remainingLabel,
  movementsLabel,
  progressPercent,
  tone,
  dotClassName,
  onOpen,
}: MonthExpenseCategoryRowProps) {
  return (
    <button
      type="button"
      className="w-full min-h-11 py-3 text-left transition-colors hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-soft"
      onClick={onOpen}
      aria-label={`Abrir detalhes de despesas da categoria ${name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} aria-hidden />
            <span className="min-w-0 truncate text-base text-foreground">{name}</span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[11px] leading-none text-muted-foreground">
              {percentLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground whitespace-nowrap">
            {remainingLabel} restante · {movementsLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap pl-2">
          <span className={`text-sm tabular-nums ${getToneTextClass(tone)}`}>{spentLabel}</span>
          <span className="text-xs text-muted-foreground">/ {allocatedLabel}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${getToneBarClass(tone)}`}
          style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
        />
      </div>
    </button>
  );
}
