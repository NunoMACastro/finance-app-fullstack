import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

type RulerTone = "neutral" | "success" | "warning" | "danger";

type MonthFinancialRulerProps =
  | {
      state: "loading";
    }
  | {
      state: "error";
      message: string;
      onRetry: () => void;
    }
  | {
      state: "budget-not-ready";
      canWriteFinancial: boolean;
      onEditBudget: () => void;
    }
  | {
      state: "ready";
      progressPercent: number;
      tone: RulerTone;
      dailyLabel: string;
      dailyValue: string;
      macroLine: ReactNode;
      statusLine: string;
      hint?: string;
    };

function toneBarClass(tone: RulerTone): string {
  if (tone === "success") return "bg-success";
  if (tone === "warning") return "bg-warning";
  if (tone === "danger") return "bg-danger";
  return "bg-muted-foreground/40";
}

function toneTextClass(tone: RulerTone): string {
  if (tone === "success") return "text-status-success";
  if (tone === "warning") return "text-status-warning";
  if (tone === "danger") return "text-status-danger";
  return "text-muted-foreground";
}

export function MonthFinancialRuler(props: MonthFinancialRulerProps) {
  if (props.state === "loading") {
    return (
      <section className="mt-5 px-1" aria-label="A carregar ritmo do mês">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-full rounded bg-muted/70" />
          <div className="h-2.5 w-full rounded-full bg-muted/70" />
          <div className="space-y-2 text-center">
            <div className="mx-auto h-4 w-32 rounded bg-muted/70" />
            <div className="mx-auto h-10 w-40 rounded bg-muted/70" />
            <div className="mx-auto h-3 w-52 rounded bg-muted/70" />
          </div>
        </div>
      </section>
    );
  }

  if (props.state === "error") {
    return (
      <section className="mt-5 border-t border-border/60 px-1 pt-4" aria-live="polite">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-status-warning">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">{props.message}</p>
          </div>
          <Button
            variant="outline"
            className="h-9 rounded-xl border-warning/60 text-status-warning hover:bg-warning/20"
            onClick={props.onRetry}
          >
            Tentar novamente
          </Button>
        </div>
      </section>
    );
  }

  if (props.state === "budget-not-ready") {
    return (
      <section className="mt-5 border-t border-border/60 px-1 pt-4 text-center">
        <p className="text-sm text-foreground">Orçamento por definir</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cria ou edita o orçamento para desbloquear lançamentos manuais e calcular o ritmo do mês.
        </p>
        {props.canWriteFinancial ? (
          <Button
            className="mt-3 h-10 rounded-xl border-0 bg-brand-gradient text-primary-foreground transition-transform hover:opacity-95 active:scale-[0.99]"
            onClick={props.onEditBudget}
          >
            Criar orçamento
          </Button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-5 border-t border-border/60 px-1 pt-4" aria-label="Ritmo financeiro do mês">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${toneBarClass(props.tone)}`}
          style={{ width: `${Math.max(0, Math.min(props.progressPercent, 100))}%` }}
        />
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">{props.dailyLabel}</p>
        <p className={`mt-1 text-4xl leading-none tracking-tight ${toneTextClass(props.tone)}`}>{props.dailyValue}</p>
        <p className="mt-3 text-xs text-foreground">{props.macroLine}</p>
        <p className={`mt-3 text-xs ${toneTextClass(props.tone)}`}>{props.statusLine}</p>
        {props.hint ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{props.hint}</p>
        ) : null}
      </div>
    </section>
  );
}
