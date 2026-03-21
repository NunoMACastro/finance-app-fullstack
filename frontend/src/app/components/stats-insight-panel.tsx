import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  Sparkles,
} from "lucide-react";
import type {
  StatsInsightAction,
  StatsInsightCategoryItem,
  StatsInsightHighlight,
  StatsInsightReport,
  StatsInsightRisk,
  StatsInsightStatusResponse,
} from "../lib/types";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";

type InsightTab = "now" | "actions" | "categories";

type PriorityItem = {
  id: string;
  label: "Risco" | "Ação" | "Oportunidade";
  title: string;
  detail: string;
  badge: string;
  tone: "positive" | "warning" | "high" | "neutral";
};

const TAB_OPTIONS: Array<{ value: InsightTab; label: string }> = [
  { value: "now", label: "Agora" },
  { value: "actions", label: "Ações" },
  { value: "categories", label: "Categorias" },
];

const CATEGORY_SLOT_CLASSES = {
  1: { soft: "bg-category-soft-1", text: "text-category-1", solid: "bg-category-solid-1" },
  2: { soft: "bg-category-soft-2", text: "text-category-2", solid: "bg-category-solid-2" },
  3: { soft: "bg-category-soft-3", text: "text-category-3", solid: "bg-category-solid-3" },
  4: { soft: "bg-category-soft-4", text: "text-category-4", solid: "bg-category-solid-4" },
  5: { soft: "bg-category-soft-5", text: "text-category-5", solid: "bg-category-solid-5" },
  6: { soft: "bg-category-soft-6", text: "text-category-6", solid: "bg-category-solid-6" },
  7: { soft: "bg-category-soft-7", text: "text-category-7", solid: "bg-category-solid-7" },
  8: { soft: "bg-category-soft-8", text: "text-category-8", solid: "bg-category-solid-8" },
  9: { soft: "bg-category-soft-9", text: "text-category-9", solid: "bg-category-solid-9" },
} as const;

function confidenceLabel(value: "low" | "medium" | "high"): string {
  if (value === "high") return "Alta";
  if (value === "low") return "Baixa";
  return "Média";
}

function badgeToneClass(kind: "positive" | "warning" | "high" | "neutral"): string {
  if (kind === "positive") return "bg-success-soft text-foreground ring-1 ring-success/30";
  if (kind === "warning") return "bg-warning-soft text-foreground ring-1 ring-warning/35";
  if (kind === "high") return "bg-danger-soft text-foreground ring-1 ring-danger/30";
  return "bg-surface-soft text-foreground ring-1 ring-border/60";
}

function dotToneClass(kind: "positive" | "warning" | "high" | "neutral"): string {
  if (kind === "positive") return "bg-success";
  if (kind === "warning") return "bg-warning";
  if (kind === "high") return "bg-danger";
  return "bg-border";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

function getSummaryExcerpt(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 150) return normalized;

  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  if (sentences.length === 0) {
    return `${normalized.slice(0, 177).trimEnd()}...`;
  }

  const first = sentences[0] ?? "";
  const second = sentences[1] ?? "";
  if (first.length >= 96 || !second) return first;

  const combined = `${first} ${second}`.trim();
  if (combined.length <= 150) return combined;
  return first;
}

function buildPriorityItems(report: StatsInsightReport): PriorityItem[] {
  const items: PriorityItem[] = [];

  report.risks
    .filter((item) => item.severity === "high")
    .forEach((item, index) => {
      items.push({
        id: `risk-high-${index}`,
        label: "Risco",
        title: item.title,
        detail: item.detail,
        badge: "Alto",
        tone: "high",
      });
    });

  report.actions
    .filter((item) => item.priority === "high")
    .forEach((item, index) => {
      items.push({
        id: `action-high-${index}`,
        label: "Ação",
        title: item.title,
        detail: item.detail,
        badge: "Alta",
        tone: "warning",
      });
    });

  report.risks
    .filter((item) => item.severity === "warning")
    .forEach((item, index) => {
      items.push({
        id: `risk-warning-${index}`,
        label: "Risco",
        title: item.title,
        detail: item.detail,
        badge: "Atenção",
        tone: "warning",
      });
    });

  report.highlights.forEach((item, index) => {
    items.push({
      id: `highlight-${index}`,
      label: "Oportunidade",
      title: item.title,
      detail: item.detail,
      badge:
        item.severity === "positive" ? "Positivo" : item.severity === "warning" ? "Atenção" : "Info",
      tone:
        item.severity === "positive"
          ? "positive"
          : item.severity === "warning"
            ? "warning"
            : "neutral",
    });
  });

  return items.slice(0, 3);
}

function sortActions(items: StatsInsightAction[]): StatsInsightAction[] {
  const weight = { high: 0, medium: 1, low: 2 } as const;
  return [...items].sort((left, right) => weight[left.priority] - weight[right.priority]);
}

function categoryProblemScore(item: StatsInsightCategoryItem): number {
  const text = `${item.title} ${item.detail} ${item.action ?? ""}`.normalize("NFD").toLowerCase();
  let score = item.action ? 4 : 0;

  if (/(insuf|risco|depend|exced|falta|cumprir|refor|alert|elevad|acima)/.test(text)) {
    score += 3;
  }

  if (item.categoryKind === "reserve" && /(abaixo|poup|reserva)/.test(text)) {
    score += 2;
  }

  if (item.categoryKind === "expense" && /(acima|gasto|despesa|mercado|subscri|habitacao)/.test(text)) {
    score += 1;
  }

  return score;
}

function getSortedCategoryItems(report: StatsInsightReport): StatsInsightCategoryItem[] {
  return report.categoryInsights
    .map((item, index) => ({
      item,
      index,
      score: categoryProblemScore(item),
    }))
    .sort((left, right) => {
      const actionDelta = Number(Boolean(right.item.action)) - Number(Boolean(left.item.action));
      if (actionDelta !== 0) return actionDelta;
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function getCategorySlot(item: StatsInsightCategoryItem): keyof typeof CATEGORY_SLOT_CLASSES | null {
  const slot = item.colorSlot;
  if (!Number.isInteger(slot)) return null;
  if (slot < 1 || slot > 9) return null;
  return slot as keyof typeof CATEGORY_SLOT_CLASSES;
}

function PriorityRow({
  item,
}: {
  item: PriorityItem;
}) {
  return (
    <article className="space-y-2 py-3" data-testid="stats-insight-now-row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", dotToneClass(item.tone))} aria-hidden="true" />
            {item.label}
          </p>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeToneClass(item.tone)}`}>
          {item.badge}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{item.detail}</p>
    </article>
  );
}

function ActionRow({
  item,
}: {
  item: StatsInsightAction;
}) {
  return (
    <article className="space-y-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeToneClass(
          item.priority === "high" ? "warning" : "neutral",
        )}`}>
          {item.priority === "high" ? "Alta" : item.priority === "medium" ? "Média" : "Baixa"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{item.detail}</p>
    </article>
  );
}

function CategoryRow({
  item,
}: {
  item: StatsInsightCategoryItem;
}) {
  const slot = getCategorySlot(item);
  const slotClasses = slot ? CATEGORY_SLOT_CLASSES[slot] : null;

  return (
    <article
      className="space-y-2 border-b border-border/60 py-3 last:border-b-0"
      data-testid={`stats-insight-category-${item.categoryId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Circle className={cn("h-3 w-3 fill-current", slotClasses?.text ?? "text-muted-foreground")} />
            <span className="truncate">{item.categoryName}</span>
          </p>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-border/50",
              slotClasses?.soft ?? "bg-surface-soft",
            )}
          >
            {item.categoryKind === "reserve" ? "Reserva" : "Despesa"}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{item.detail}</p>
      {item.action ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{item.action}</span>
        </p>
      ) : null}
    </article>
  );
}

export function StatsInsightPanel({
  insight,
  isRequesting,
  consecutivePollFailures,
  pollingSuspended,
  pollErrorMessage,
  onResumePolling,
}: {
  insight: StatsInsightStatusResponse | null;
  isRequesting: boolean;
  consecutivePollFailures?: number;
  pollingSuspended?: boolean;
  pollErrorMessage?: string | null;
  onResumePolling?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<InsightTab>("now");

  const generatedAtLabel = insight?.generatedAt ? formatDateTime(insight.generatedAt) : null;

  const priorityItems = useMemo(
    () => (insight?.report ? buildPriorityItems(insight.report) : []),
    [insight?.report],
  );
  const sortedActions = useMemo(
    () => (insight?.report ? sortActions(insight.report.actions) : []),
    [insight?.report],
  );
  const sortedCategories = useMemo(
    () => (insight?.report ? getSortedCategoryItems(insight.report) : []),
    [insight?.report],
  );

  useEffect(() => {
    setActiveTab("now");
  }, [insight?.id, insight?.forecastWindow]);

  if (!insight) {
    return null;
  }

  if (insight.status === "pending" || isRequesting) {
    return (
      <section className="space-y-3 border-y border-border/60 py-4">
        <div className="flex items-center gap-3">
          <Clock3 className="h-4 w-4 shrink-0 animate-pulse text-primary" />
          <p className="text-sm text-foreground">A gerar análise...</p>
        </div>
        {pollingSuspended ? (
          <div className="space-y-3 rounded-2xl border border-warning/40 bg-warning-soft p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-warning-foreground">Verificação automática em pausa</p>
                <p className="text-xs text-warning-foreground">
                  {pollErrorMessage ?? "O pedido continua pendente, mas a verificação automática foi interrompida."}
                </p>
                {consecutivePollFailures ? (
                  <p className="text-xs text-warning-foreground">
                    Falhas consecutivas: {consecutivePollFailures}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-warning/60 text-warning-foreground hover:bg-warning/20"
              onClick={() => onResumePolling?.()}
            >
              Retomar verificação
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  if (insight.status === "failed") {
    return (
      <section className="border-y border-danger/40 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-danger" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-danger-foreground">Análise IA indisponível</h2>
            <p className="text-sm text-danger-foreground">
              {insight.error?.message ?? "Não foi possível gerar a análise IA."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!insight.report) {
    return null;
  }

  const summaryExcerpt = getSummaryExcerpt(insight.report.summary);

  return (
    <div className="space-y-5">
      <section className="space-y-3 border-y border-border/60 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análise IA</p>
          </div>
          {insight.stale ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-warning/35">
              Desatualizado
            </span>
          ) : (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-success/30">
              Atual
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resumo do período</p>
          <p className="text-sm leading-6 text-foreground">{summaryExcerpt}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-surface-soft px-2 py-1 text-foreground ring-1 ring-border/60">
            Confiança {confidenceLabel(insight.report.confidence)}
          </span>
          {generatedAtLabel ? (
            <span className="rounded-full bg-surface-soft px-2 py-1 text-foreground ring-1 ring-border/60">Gerado em {generatedAtLabel}</span>
          ) : null}
          {insight.model ? <span className="rounded-full bg-surface-soft px-2 py-1 text-foreground ring-1 ring-border/60">{insight.model}</span> : null}
        </div>
      </section>

      <section className="space-y-3">
        <SegmentedControlV3
          value={activeTab}
          onChange={(value) => setActiveTab(value as InsightTab)}
          options={TAB_OPTIONS}
          size="compact"
          ariaLabel="Selecionar secção da análise"
        />

        {activeTab === "now" ? (
          <section className="space-y-3" data-testid="stats-insight-tab-now">
            {priorityItems.length > 0 ? (
              <div className="divide-y divide-border/60" data-testid="stats-insight-priorities">
                {priorityItems.map((item) => (
                  <PriorityRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                Ainda sem sinais prioritários para este período.
              </p>
            )}
          </section>
        ) : null}

        {activeTab === "actions" ? (
          <section className="space-y-3" data-testid="stats-insight-tab-actions">
            {sortedActions.length > 0 ? (
              <div className="divide-y divide-border/60">
                {sortedActions.map((item, index) => (
                  <ActionRow key={`${item.title}-${index}`} item={item} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                Ainda sem ações específicas para este período.
              </p>
            )}
          </section>
        ) : null}

        {activeTab === "categories" ? (
          <section className="space-y-3" data-testid="stats-insight-tab-categories">
            {sortedCategories.length > 0 ? (
              <div data-testid="stats-insight-categories">
                {sortedCategories.map((item) => (
                  <CategoryRow key={item.categoryId} item={item} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                Ainda sem categorias em foco para este período.
              </p>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
}
