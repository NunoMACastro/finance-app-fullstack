import { AlertTriangle, Bot, CheckCircle2, Clock3 } from "lucide-react";
import type { StatsInsightStatusResponse, UserProfile } from "../lib/types";

function confidenceLabel(value: "low" | "medium" | "high"): string {
  if (value === "high") return "Alta";
  if (value === "low") return "Baixa";
  return "Média";
}

function badgeToneClass(kind: "positive" | "warning" | "high" | "neutral"): string {
  if (kind === "positive") return "bg-success-soft text-success-foreground";
  if (kind === "warning") return "bg-warning-soft text-warning-foreground";
  if (kind === "high") return "bg-danger-soft text-danger-foreground";
  return "bg-surface-soft text-muted-foreground";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function StatsInsightPanel({
  insight,
  isRequesting,
}: {
  insight: StatsInsightStatusResponse | null;
  isRequesting: boolean;
  user?: Pick<UserProfile, "currency"> | null | undefined;
}) {
  const generatedAtLabel =
    insight?.generatedAt ? formatDateTime(insight.generatedAt) : null;

  if (!insight) {
    return null;
  }

  if (insight.status === "pending" || isRequesting) {
    return (
      <section className="border-y border-border/60 py-4">
        <div className="flex items-center gap-3">
          <Clock3 className="h-4 w-4 shrink-0 animate-pulse text-primary" />
          <p className="text-sm text-foreground">A gerar insight...</p>
        </div>
      </section>
    );
  }

  if (insight.status === "failed") {
    return (
      <section className="border-y border-danger/40 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-danger-foreground">Insight IA indisponível</h2>
            <p className="text-sm text-danger-foreground">
              {insight.error?.message ?? "Não foi possível gerar o insight IA."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!insight.report) {
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 border-y border-border/60 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Insight IA</p>
              {insight.stale ? (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                  Desatualizado
                </span>
              ) : (
                <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success-foreground">
                  Atual
                </span>
              )}
            </div>
            <p className="text-base text-foreground">{insight.report.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-surface-soft px-2 py-1">
              Confiança: {confidenceLabel(insight.report.confidence)}
            </span>
            {generatedAtLabel ? <span>Gerado em {generatedAtLabel}</span> : null}
            {insight.model ? <span>Modelo: {insight.model}</span> : null}
          </div>
        </div>
      </section>

      {insight.report.highlights.length > 0 ? (
        <section className="space-y-2 border-b border-border/60 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Highlights</h3>
          <div className="divide-y divide-border/60 border-y border-border/60">
            {insight.report.highlights.map((item, index) => (
              <article key={`${item.title}-${index}`} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeToneClass(
                    item.severity === "positive"
                      ? "positive"
                      : item.severity === "warning"
                        ? "warning"
                        : "neutral",
                  )}`}>
                    {item.severity === "positive" ? "Positivo" : item.severity === "warning" ? "Atenção" : "Info"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {insight.report.risks.length > 0 ? (
        <section className="space-y-2 border-b border-border/60 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Riscos</h3>
          <div className="divide-y divide-border/60 border-y border-border/60">
            {insight.report.risks.map((item, index) => (
              <article key={`${item.title}-${index}`} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeToneClass(
                    item.severity === "high" ? "high" : "warning",
                  )}`}>
                    {item.severity === "high" ? "Alto" : "Atenção"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {insight.report.actions.length > 0 ? (
        <section className="space-y-2 border-b border-border/60 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações recomendadas</h3>
          <div className="divide-y divide-border/60 border-y border-border/60">
            {insight.report.actions.map((item, index) => (
              <article key={`${item.title}-${index}`} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.priority}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {insight.report.categoryInsights.length > 0 ? (
        <section className="space-y-2 border-b border-border/60 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categorias em foco</h3>
          <div className="divide-y divide-border/60 border-y border-border/60">
            {insight.report.categoryInsights.map((item) => (
              <article key={item.categoryId} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.categoryName}</p>
                  <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {item.categoryKind === "reserve" ? "Reserva" : "Despesa"}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
                {item.action ? (
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item.action}</span>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {insight.report.limitations?.length ? (
        <section className="space-y-2 border-b border-border/60 pb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas</h3>
          <ul className="space-y-1">
            {insight.report.limitations.map((item, index) => (
              <li key={`${item}-${index}`} className="text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
