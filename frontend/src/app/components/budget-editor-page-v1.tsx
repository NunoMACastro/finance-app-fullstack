import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Check, Loader2, Percent, Plus, Trash2, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { budgetApi } from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { useAccount } from "../lib/account-context";
import { useAuth } from "../lib/auth-context";
import { formatCurrency as formatCurrencyValue, formatMonthLong } from "../lib/formatting";
import type { BudgetCategory, BudgetTemplate, MonthBudget } from "../lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ConfirmActionDialog } from "./confirm-action-dialog";

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

function getCatColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function catEur(cat: BudgetCategory, totalBudget: number): number {
  return (cat.percent / 100) * totalBudget;
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
        setBudget(loadedBudget);
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

  const handleBack = () => {
    navigate(`/?month=${month}`);
  };

  const updateCategory = (id: string, field: "name" | "percent", value: string | number) => {
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
      return {
        ...prev,
        categories: [
          ...prev.categories,
          {
            id: `cat_new_${Date.now()}`,
            name: cleanName,
            percent: parseFloat(newCatPercent) || 0,
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
        categories: budget.categories,
      });
      setBudget(saved);
      toast.success("Orçamento guardado");
      navigate(`/?month=${saved.month}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível guardar o orçamento"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-base text-foreground">Editar Orçamento</h2>
          <p className="text-xs text-muted-foreground capitalize">{getMonthLabel(month)}</p>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 border-0 shadow-md flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </Card>
      ) : loadError ? (
        <Card className="border-warning/40 bg-warning-soft shadow-sm">
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 shrink-0" />
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
        </Card>
      ) : budget ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          {!canWriteFinancial && (
            <Card className="border-border bg-info-soft shadow-sm">
              <div className="p-3 text-xs text-info-foreground">
                Modo leitura: sem permissão para editar o orçamento.
              </div>
            </Card>
          )}

          {templates.length > 0 && (
            <Card className="border-0 shadow-md p-4 flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Templates</label>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="rounded-xl border border-border bg-surface-soft px-3 py-2 text-left hover:bg-accent transition-colors"
                    onClick={() => applyTemplate(template)}
                    disabled={!canWriteFinancial}
                  >
                    <p className="text-sm text-info-foreground">{template.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {template.categories.map((category) => `${category.name} ${category.percent}%`).join(" • ")}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-xl border border-dashed border-muted-foreground/30 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    setBudget((prev) => (prev ? { ...prev, categories: [] } : prev));
                  }}
                  disabled={!canWriteFinancial}
                >
                  <p className="text-sm text-foreground">Personalizado</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Começar com categorias vazias</p>
                </button>
              </div>
            </Card>
          )}

          <Card className="border-0 shadow-md p-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">Orçamento Total (EUR)</label>
              <div className="relative opacity-80">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  className="pl-10 h-11 rounded-xl"
                  value={budget.totalBudget}
                  readOnly
                  disabled
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Valor calculado automaticamente pela soma das receitas do mês.
              </p>
            </div>

            <div
              className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl ${
                Math.abs(pctDiff) < 0.01
                    ? "bg-success-soft text-status-success"
                  : pctDiff < 0
                    ? "bg-warning-soft text-status-warning"
                    : "bg-danger-soft text-status-danger"
              }`}
            >
              {Math.abs(pctDiff) < 0.01 ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>
                Total: {totalPct.toFixed(1)}%
                {pctDiff < -0.01 && ` — ${Math.abs(pctDiff).toFixed(1)}% por alocar`}
                {pctDiff > 0.01 && ` — ${pctDiff.toFixed(1)}% a mais`}
                {Math.abs(pctDiff) < 0.01 && " — 100%"}
              </span>
            </div>

            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
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

            <div className="flex flex-col gap-2.5">
              <label className="text-sm text-muted-foreground">Categorias</label>
              {budget.categories.map((category, index) => (
                <div key={category.id} className="rounded-xl border border-border/60 bg-muted/20 p-2.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getCatColor(index).gradient} shrink-0`} />
                    <Input
                      className="flex-1 h-9 rounded-xl text-sm"
                      value={category.name}
                      onChange={(event) => updateCategory(category.id, "name", event.target.value)}
                      placeholder="Nome da categoria"
                      disabled={!canWriteFinancial}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive rounded-xl h-9 w-9"
                      onClick={() => setPendingRemoveCategoryId(category.id)}
                      aria-label={`Remover categoria ${category.name}`}
                      disabled={!canWriteFinancial}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="w-full h-9 rounded-xl text-sm text-right pr-7"
                        value={category.percent}
                        onChange={(event) => updateCategory(category.id, "percent", event.target.value)}
                        disabled={!canWriteFinancial}
                      />
                      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                    <span className="text-xs text-muted-foreground text-right tabular-nums min-w-[90px]">
                      {formatCurrency(catEur(category, budget.totalBudget))}
                    </span>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-dashed border-border/80 p-2.5 flex flex-col gap-2 mt-1 pt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted shrink-0" />
                  <Input
                    className="flex-1 h-9 rounded-xl text-sm"
                    value={newCatName}
                    onChange={(event) => setNewCatName(event.target.value)}
                    placeholder="Nova categoria..."
                    onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCategory())}
                    disabled={!canWriteFinancial}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                      className="shrink-0 text-primary hover:bg-accent rounded-xl h-9 w-9"
                    onClick={addCategory}
                    disabled={!newCatName.trim() || !canWriteFinancial}
                    aria-label="Adicionar categoria"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-full h-9 rounded-xl text-sm text-right pr-7"
                      value={newCatPercent}
                      onChange={(event) => setNewCatPercent(event.target.value)}
                      placeholder="0"
                      onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addCategory())}
                      disabled={!canWriteFinancial}
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                  <span className="text-xs text-muted-foreground text-right tabular-nums min-w-[90px]">
                    {formatCurrency(((parseFloat(newCatPercent) || 0) / 100) * budget.totalBudget)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/70 px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={handleBack}>
                Cancelar
              </Button>
              <Button
                className="rounded-xl flex-1 bg-brand-gradient text-primary-foreground border-0 shadow-card"
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
        </motion.div>
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
