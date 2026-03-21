import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Check, Loader2, Percent, Plus, Trash2, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { budgetApi } from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { useAccount } from "../lib/account-context";
import { useAuth } from "../lib/auth-context";
import { formatCurrency as formatCurrencyValue, formatMonthLong } from "../lib/formatting";
import { nextCategoryColorSlot, resolveCategoryColorSlot } from "../lib/category-color-slot";
import { normalizeBudgetCategoriesKind, normalizeBudgetCategoryKind } from "../lib/category-kind";
import type { BudgetCategory, BudgetTemplate, MonthBudget } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { IconActionButtonV3, SelectableTileButtonV3 } from "./v3/interaction-primitives-v3";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

const CATEGORY_COLORS = [
  { gradient: "bg-category-gradient-1" },
  { gradient: "bg-category-gradient-2" },
  { gradient: "bg-category-gradient-3" },
  { gradient: "bg-category-gradient-4" },
  { gradient: "bg-category-gradient-5" },
  { gradient: "bg-category-gradient-6" },
  { gradient: "bg-category-gradient-7" },
  { gradient: "bg-category-gradient-8" },
  { gradient: "bg-category-gradient-9" },
];

const CATEGORY_KIND_OPTIONS = [
  { value: "expense", label: "Despesa" },
  { value: "reserve", label: "Reserva" },
] as const;
const RECURRING_EXPENSE_FALLBACK_CATEGORY_ID = "fallback_recurring_expense";

function getCatColor(colorSlot?: number, fallbackIndex = 0) {
  const resolvedSlot = colorSlot ?? ((fallbackIndex % CATEGORY_COLORS.length) + 1);
  return CATEGORY_COLORS[(resolvedSlot - 1) % CATEGORY_COLORS.length];
}

function catEur(cat: BudgetCategory, totalBudget: number): number {
  return (cat.percent / 100) * totalBudget;
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

function isMonthKey(value?: string): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export function BudgetEditorPage() {
  const navigate = useNavigate();
  const { month: routeMonth } = useParams();
  const { canWriteFinancial } = useAccount();
  const { user, isAmountsHidden } = useAuth();
  const month = isMonthKey(routeMonth) ? routeMonth : new Date().toISOString().slice(0, 7);

  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatPercent, setNewCatPercent] = useState("");
  const [pendingRemoveCategoryId, setPendingRemoveCategoryId] = useState<string | null>(null);

  const formatCurrency = (value: number) => formatCurrencyValue(value, user, isAmountsHidden);
  const getMonthLabel = (monthKey: string) => formatMonthLong(monthKey, user);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [loadedBudget, loadedTemplates] = await Promise.all([
          budgetApi.get(month),
          budgetApi.getTemplates(),
        ]);
        if (cancelled) return;
        setBudget({
          ...loadedBudget,
          categories: normalizeBudgetCategoriesKind(loadedBudget.categories),
        });
        setTemplates(loadedTemplates);
      } catch (error) {
        if (cancelled) return;
        setLoadError(getErrorMessage(error, "Não foi possível carregar o editor de orçamento"));
        setBudget(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const totalPct = useMemo(
    () => budget?.categories.reduce((sum, category) => sum + category.percent, 0) ?? 0,
    [budget],
  );
  const pctDiff = totalPct - 100;
  const isTotalExact = Math.abs(pctDiff) < 0.01;
  const absoluteDiff = Math.abs(100 - totalPct);

  const handleBack = () => {
    navigate(`/?month=${month}`);
  };

  const updateCategory = (
    id: string,
    field: "name" | "percent" | "kind",
    value: string | number,
  ) => {
    setBudget((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map((category) =>
          category.id === id
            ? {
                ...category,
                [field]: field === "percent" ? (parseFloat(String(value)) || 0) : value,
              }
            : category,
        ),
      };
    });
  };

  const addCategory = () => {
    const cleanName = newCatName.trim();
    if (!cleanName) return;
    setBudget((prev) => {
      if (!prev) return prev;
      const categoryId = `cat_new_${Date.now()}`;
      return {
        ...prev,
        categories: [
          ...prev.categories,
          {
            id: categoryId,
            name: cleanName,
            percent: parseFloat(newCatPercent) || 0,
            colorSlot: nextCategoryColorSlot(prev.categories, categoryId),
            kind: "expense",
          },
        ],
      };
    });
    setNewCatName("");
    setNewCatPercent("");
  };

  const applyTemplate = (template: BudgetTemplate) => {
    setBudget((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: template.categories.map((category) => ({
          id: `${template.id}_${category.id}`,
          name: category.name,
          percent: category.percent,
          colorSlot: category.colorSlot,
          kind: normalizeBudgetCategoryKind(category.kind, category.name),
        })),
      };
    });
  };

  const handleSave = async () => {
    if (!budget || !canWriteFinancial) return;
    setSaving(true);
    try {
      const saved = await budgetApi.save(budget.month, {
        totalBudget: budget.totalBudget,
        categories: normalizeBudgetCategoriesKind(budget.categories),
      });
      setBudget({
        ...saved,
        categories: normalizeBudgetCategoriesKind(saved.categories),
      });
      toast.success("Orçamento guardado");
      navigate(`/?month=${saved.month}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível guardar o orçamento"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="budget-editor">
      <PageHeaderV3
        title="Editar Orçamento"
        subtitle={getMonthLabel(month)}
        leading={(
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
      />

      {loading ? (
        <PageSectionFadeInV3 asChild>
          <section className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </section>
        </PageSectionFadeInV3>
      ) : loadError ? (
        <PageSectionFadeInV3 asChild>
          <section className="rounded-xl border border-warning/40 bg-warning-soft">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
                <p className="text-sm text-warning-foreground">{loadError}</p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-warning/60 text-status-warning hover:bg-warning/20"
                onClick={() => navigate(0)}
              >
                Tentar novamente
              </Button>
            </div>
          </section>
        </PageSectionFadeInV3>
      ) : budget ? (
        <div className={UI_V3_CLASS.sectionStack}>
          {!canWriteFinancial && (
            <PageSectionFadeInV3 asChild>
              <section className="rounded-xl border border-border/70 bg-info-soft">
                <div className="p-3 text-xs text-info-foreground">
                  Modo leitura: sem permissão para editar o orçamento.
                </div>
              </section>
            </PageSectionFadeInV3>
          )}

          {templates.length > 0 && (
            <PageSectionFadeInV3 asChild>
              <section className="flex flex-col gap-2 border-y border-border/60 py-4">
                <p className="text-sm text-muted-foreground">Templates</p>
                <div className="grid grid-cols-1 gap-2">
                  {templates.map((template) => (
                    <SelectableTileButtonV3
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      disabled={!canWriteFinancial}
                      title={<span className="text-info-foreground">{template.name}</span>}
                      description={template.categories.map((category) => `${category.name} ${category.percent}%`).join(" • ")}
                    />
                  ))}
                  <SelectableTileButtonV3
                    className="border-dashed border-muted-foreground/30 bg-transparent hover:bg-muted/30"
                    onClick={() => {
                      setBudget((prev) => (prev ? { ...prev, categories: [] } : prev));
                    }}
                    disabled={!canWriteFinancial}
                    title="Personalizado"
                    description="Começar com categorias vazias"
                  />
                </div>
              </section>
            </PageSectionFadeInV3>
          )}

          <PageSectionFadeInV3 asChild>
            <section className="flex flex-col gap-4 border-y border-border/60 py-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">Orçamento Total (EUR)</label>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <p className="whitespace-nowrap text-xl leading-none tracking-tight text-foreground">
                    {formatCurrency(budget.totalBudget)}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Valor calculado automaticamente pela soma das receitas do mês.
                </p>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
                  Math.abs(pctDiff) < 0.01
                    ? "bg-success-soft text-status-success"
                    : pctDiff < 0
                      ? "bg-warning-soft text-status-warning"
                      : "bg-danger-soft text-status-danger"
                }`}
              >
                {Math.abs(pctDiff) < 0.01 ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {isTotalExact ? "Total: 100%" : `Total: ${formatPercent(totalPct)} (diferença ${formatPercent(absoluteDiff)})`}
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={`h-full rounded-full transition-colors ${
                    Math.abs(pctDiff) < 0.01
                      ? "bg-success"
                      : totalPct > 100
                        ? "bg-danger"
                        : "bg-warning"
                  }`}
                  animate={{ width: `${Math.min(totalPct, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </section>
          </PageSectionFadeInV3>

          <PageSectionFadeInV3 asChild>
            <section className="flex flex-col gap-3">
              <label className="text-sm text-muted-foreground">Categorias</label>
              <div className="divide-y divide-border/60 border-y border-border/60">
                {budget.categories.map((category, index) => (
                  <div key={category.id} className="flex flex-col gap-3 py-3">
                    {category.id === RECURRING_EXPENSE_FALLBACK_CATEGORY_ID ? (
                      <span className="inline-flex w-fit rounded-full bg-warning-soft px-2 py-0.5 text-[10px] text-warning-foreground">
                        Categoria do sistema (não editável)
                      </span>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full ${getCatColor(resolveCategoryColorSlot(category, index), index).gradient}`}
                      />
                      <Input
                        className="h-9 flex-1 rounded-xl text-sm"
                        value={category.name}
                        onChange={(event) => updateCategory(category.id, "name", event.target.value)}
                        placeholder="Nome da categoria"
                        disabled={!canWriteFinancial || category.id === RECURRING_EXPENSE_FALLBACK_CATEGORY_ID}
                      />
                      <IconActionButtonV3
                        ariaLabel={`Remover categoria ${category.name}`}
                        onClick={() => setPendingRemoveCategoryId(category.id)}
                        tone="danger"
                        size="compact"
                        disabled={!canWriteFinancial || category.id === RECURRING_EXPENSE_FALLBACK_CATEGORY_ID}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconActionButtonV3>
                    </div>
                    <div className="flex items-center justify-end">
                      <SegmentedControlV3
                        value={(category.kind ?? "expense") as "expense" | "reserve"}
                        onChange={(nextKind) => updateCategory(category.id, "kind", nextKind)}
                        options={CATEGORY_KIND_OPTIONS.map((option) => ({
                          ...option,
                          disabled:
                            !canWriteFinancial || category.id === RECURRING_EXPENSE_FALLBACK_CATEGORY_ID,
                        }))}
                        size="compact"
                        className="rounded-xl"
                        ariaLabel={`Tipo da categoria ${category.name}`}
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          className="h-9 w-full rounded-xl pr-7 text-right text-sm"
                          value={category.percent}
                          onChange={(event) => updateCategory(category.id, "percent", event.target.value)}
                          disabled={!canWriteFinancial || category.id === RECURRING_EXPENSE_FALLBACK_CATEGORY_ID}
                        />
                        <Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <span className="min-w-[90px] whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(catEur(category, budget.totalBudget))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/80 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 shrink-0 rounded-full bg-muted" />
                  <Input
                    className="h-9 flex-1 rounded-xl text-sm"
                    value={newCatName}
                    onChange={(event) => setNewCatName(event.target.value)}
                    placeholder="Nova categoria..."
                    onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCategory())}
                    disabled={!canWriteFinancial}
                  />
                  <IconActionButtonV3
                    ariaLabel="Adicionar categoria"
                    onClick={addCategory}
                    size="compact"
                    disabled={!newCatName.trim() || !canWriteFinancial}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </IconActionButtonV3>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="h-9 w-full rounded-xl pr-7 text-right text-sm"
                      value={newCatPercent}
                      onChange={(event) => setNewCatPercent(event.target.value)}
                      placeholder="0"
                      onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCategory())}
                      disabled={!canWriteFinancial}
                    />
                    <Percent className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <span className="min-w-[90px] whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                    {formatCurrency(((parseFloat(newCatPercent) || 0) / 100) * budget.totalBudget)}
                  </span>
                </div>
              </div>
            </section>
          </PageSectionFadeInV3>

          <PageSectionFadeInV3 asChild>
            <div className="sticky bottom-0 border-t border-border/70 bg-background/95 px-0 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <div className="min-w-0">
                  <Button variant="outline" className="w-full rounded-xl" onClick={handleBack}>
                    Cancelar
                  </Button>
                </div>
                <div className="shrink-0">
                  <Button
                    className="rounded-xl"
                    onClick={handleSave}
                    disabled={
                      saving
                      || !canWriteFinancial
                      || budget.categories.length === 0
                      || Math.abs(pctDiff) > 0.01
                    }
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </div>
          </PageSectionFadeInV3>
        </div>
      ) : null}

      <ConfirmActionDialog
        open={Boolean(pendingRemoveCategoryId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingRemoveCategoryId(null);
          }
        }}
        title="Remover categoria do orçamento?"
        description="Esta categoria será removida deste mês e as percentagens podem deixar de totalizar 100%."
        confirmLabel="Remover"
        onConfirm={async () => {
          if (!pendingRemoveCategoryId) return;
          setBudget((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              categories: prev.categories.filter((category) => category.id !== pendingRemoveCategoryId),
            };
          });
          setPendingRemoveCategoryId(null);
        }}
      />
    </div>
  );
}
