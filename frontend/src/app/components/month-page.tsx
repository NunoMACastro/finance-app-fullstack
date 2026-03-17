import React, { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  OverlayBody,
  OverlayContent,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "./ui/responsive-overlay";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useIsMobile } from "./ui/use-mobile";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  ShoppingCart,
  AlertTriangle,
  Banknote,
  Settings2,
  Lock,
} from "lucide-react";
import {
  transactionsApi,
  budgetApi,
  incomeCategoriesApi,
} from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { isApiError } from "../lib/http-client";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { useAccount } from "../lib/account-context";
import { useAuth } from "../lib/auth-context";
import { formatCurrency as formatCurrencyValue, formatDateShort, formatMonthLong } from "../lib/formatting";
import { resolveCategoryColorSlot } from "../lib/category-color-slot";
import { normalizeBudgetCategoryKind } from "../lib/category-kind";
import type {
  MonthSummary,
  MonthBudget,
  BudgetCategory,
  IncomeCategory,
} from "../lib/types";
import { toast } from "sonner";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { MonthFinancialRuler } from "./month-financial-ruler";
import { MonthExpenseCategoryRow } from "./month-expense-category-row";
import { CategoryExpensesSheet } from "./category-expenses-sheet";
import { SegmentedControlV3 } from "./v3/segmented-control-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

function getDaysRemainingInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-");
  const year = parseInt(y);
  const month = parseInt(m) - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  if (now.getFullYear() === year && now.getMonth() === month) {
    return Math.max(lastDay - now.getDate() + 1, 1);
  }
  if (new Date(year, month) > new Date(now.getFullYear(), now.getMonth())) {
    return lastDay;
  }
  return 0;
}

function getDaysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-");
  const year = Number.parseInt(y, 10);
  const month = Number.parseInt(m, 10) - 1;
  return new Date(year, month + 1, 0).getDate();
}

function isNearZero(value: number): boolean {
  return Math.abs(value) < 0.009;
}

function getDaysRemainingLabel(days: number): string {
  return `${days} ${days === 1 ? "dia" : "dias"} restantes`;
}

type MonthRulerTone = "neutral" | "success" | "warning" | "danger";

type MonthRulerReadyModel = {
  tone: MonthRulerTone;
  progressPercent: number;
  dailyValue: number | null;
  daysLabel: string;
  statusText: string;
  hint?: string;
};

function buildMonthRulerReadyModel({
  monthKey,
  totalBudget,
  totalIncome,
  totalExpense,
  remaining,
  daysLeft,
}: {
  monthKey: string;
  totalBudget: number;
  totalIncome: number;
  totalExpense: number;
  remaining: number;
  daysLeft: number;
}): MonthRulerReadyModel {
  const progressPercent = totalBudget > 0
    ? Math.max(0, Math.min((totalExpense / totalBudget) * 100, 100))
    : 0;
  const hasExceededBudget = remaining < -0.009 || (totalBudget > 0 && totalExpense > totalBudget + 0.009);

  if (daysLeft <= 0) {
    return {
      tone: hasExceededBudget ? "danger" : "neutral",
      progressPercent: hasExceededBudget ? 100 : progressPercent,
      dailyValue: null,
      daysLabel: "Mês fechado",
      statusText: hasExceededBudget ? "Acima do orçamento" : "Mês fechado",
    };
  }

  const daysLeftLabel = getDaysRemainingLabel(daysLeft);

  if (hasExceededBudget) {
    return {
      tone: "danger",
      progressPercent: 100,
      dailyValue: 0,
      daysLabel: daysLeftLabel,
      statusText: "Acima do orçamento",
    };
  }

  if (isNearZero(totalIncome) && isNearZero(totalExpense) && isNearZero(remaining)) {
    return {
      tone: "neutral",
      progressPercent,
      dailyValue: 0,
      daysLabel: daysLeftLabel,
      statusText: "À espera de movimentos",
      hint: "Ainda sem atividade este mês",
    };
  }

  if (totalIncome > 0.009 && isNearZero(totalExpense) && remaining > 0.009) {
    return {
      tone: "success",
      progressPercent,
      dailyValue: remaining / daysLeft,
      daysLabel: daysLeftLabel,
      statusText: "Boa margem neste momento",
    };
  }

  const daysInMonth = getDaysInMonth(monthKey);
  if (totalBudget > 0.009 && daysInMonth > 0) {
    const expectedRemaining = totalBudget * (daysLeft / daysInMonth);
    const tightThreshold = expectedRemaining * 0.75;
    const comfortableThreshold = expectedRemaining * 1.2;
    if (remaining <= tightThreshold) {
      return {
        tone: "warning",
        progressPercent,
        dailyValue: remaining / daysLeft,
        daysLabel: daysLeftLabel,
        statusText: "Ritmo apertado",
      };
    }
    if (remaining >= comfortableThreshold) {
      return {
        tone: "success",
        progressPercent,
        dailyValue: remaining / daysLeft,
        daysLabel: daysLeftLabel,
        statusText: "Margem confortável",
      };
    }
  }

  return {
    tone: "success",
    progressPercent,
    dailyValue: remaining / daysLeft,
    daysLabel: daysLeftLabel,
    statusText: "Dentro do orçamento",
  };
}

const CATEGORY_COLORS = [
  { text: "text-category-1", solid: "bg-category-solid-1", gradient: "bg-category-gradient-1" },
  { text: "text-category-2", solid: "bg-category-solid-2", gradient: "bg-category-gradient-2" },
  { text: "text-category-3", solid: "bg-category-solid-3", gradient: "bg-category-gradient-3" },
  { text: "text-category-4", solid: "bg-category-solid-4", gradient: "bg-category-gradient-4" },
  { text: "text-category-5", solid: "bg-category-solid-5", gradient: "bg-category-gradient-5" },
  { text: "text-category-6", solid: "bg-category-solid-6", gradient: "bg-category-gradient-6" },
  { text: "text-category-7", solid: "bg-category-solid-7", gradient: "bg-category-gradient-7" },
  { text: "text-category-8", solid: "bg-category-solid-8", gradient: "bg-category-gradient-8" },
  { text: "text-category-9", solid: "bg-category-solid-9", gradient: "bg-category-gradient-9" },
];

function getCatColor(colorSlot?: number, fallbackIndex = 0) {
  const resolvedSlot = colorSlot ?? ((fallbackIndex % CATEGORY_COLORS.length) + 1);
  return CATEGORY_COLORS[(resolvedSlot - 1) % CATEGORY_COLORS.length];
}

function catEur(cat: BudgetCategory, totalBudget: number): number {
  return (cat.percent / 100) * totalBudget;
}

function hasRegisteredMonthInfo(monthBudget: MonthBudget): boolean {
  return monthBudget.categories.length > 0 || Math.abs(monthBudget.totalBudget) > 0.009;
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

function formatMonthCompact(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIndex = Number(monthStr) - 1;
  const yearShort = yearStr.slice(-2);
  const monthName = MONTH_NAMES_PT[monthIndex] ?? monthKey;
  return `${monthName} / ${yearShort}`;
}

// ============================================================
// MAIN PAGE
// ============================================================
export function MonthPage() {
  const { activeAccountId, activeAccountRole, canWriteFinancial } = useAccount();
  const { user, isAmountsHidden } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const minimumOffset = -now.getMonth();
  const initialMonthOffset = (() => {
    const monthParam = searchParams.get("month");
    if (!monthParam || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) return 0;
    const [year, month] = monthParam.split("-").map(Number);
    const rawOffset = (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
    if (rawOffset > 0) return 0;
    if (rawOffset < minimumOffset) return minimumOffset;
    return rawOffset;
  })();
  const [monthOffset, setMonthOffset] = useState(initialMonthOffset);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeExpenseCategoryId, setActiveExpenseCategoryId] = useState<string | null>(null);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [showIncomeCategoriesDialog, setShowIncomeCategoriesDialog] = useState(false);
  const [pendingDeleteTransactionId, setPendingDeleteTransactionId] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthPickerLoading, setMonthPickerLoading] = useState(false);
  const [monthAvailability, setMonthAvailability] = useState<Record<string, boolean>>({});

  const formatCurrency = useCallback(
    (val: number) => formatCurrencyValue(val, user, isAmountsHidden),
    [isAmountsHidden, user],
  );
  const formatDate = useCallback((value: string) => formatDateShort(value, user), [user]);
  const getMonthLabel = useCallback((value: string) => formatMonthLong(value, user), [user]);

  const currentMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const monthOptions = Array.from({ length: now.getMonth() + 1 }, (_, monthIndex) => {
    const date = new Date(now.getFullYear(), monthIndex, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: getMonthLabel(value) };
  });
  const compactCurrentMonthLabel = formatMonthCompact(currentMonth);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryData, budgetData, incomeCategoriesData] = await Promise.all([
        transactionsApi.getMonthSummary(currentMonth),
        budgetApi.get(currentMonth),
        incomeCategoriesApi.list(),
      ]);
      setSummary(summaryData);
      setBudget(budgetData);
      setIncomeCategories(incomeCategoriesData);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Não foi possível carregar os dados do mês"));
      setSummary(null);
      setBudget(null);
      setIncomeCategories([]);
    } finally {
      setLoading(false);
    }
  }, [activeAccountId, currentMonth]);

  const reloadIncomeCategories = useCallback(async () => {
    try {
      const categories = await incomeCategoriesApi.list();
      setIncomeCategories(categories);
    } catch {
      setIncomeCategories([]);
    }
  }, [activeAccountId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setMonthAvailability({});
  }, [activeAccountId]);

  useEffect(() => {
    if (!budget) return;
    setMonthAvailability((prev) => ({
      ...prev,
      [currentMonth]: hasRegisteredMonthInfo(budget),
    }));
  }, [budget, currentMonth]);

  useEffect(() => {
    const queryMonth = searchParams.get("month");
    if (queryMonth === currentMonth) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("month", currentMonth);
    setSearchParams(nextParams, { replace: true });
  }, [currentMonth, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeExpenseCategoryId) return;
    if (budget?.categories.some((category) => category.id === activeExpenseCategoryId)) return;
    setActiveExpenseCategoryId(null);
  }, [activeExpenseCategoryId, budget]);

  const openMonthPicker = async () => {
    setMonthPickerOpen(true);
    const hasAllStatuses = monthOptions.every((option) => monthAvailability[option.value] !== undefined);
    if (hasAllStatuses) return;

    setMonthPickerLoading(true);
    const checks = await Promise.allSettled(
      monthOptions.map(async (option) => {
        const monthBudget = await budgetApi.get(option.value);
        return [option.value, hasRegisteredMonthInfo(monthBudget)] as const;
      }),
    );

    const nextAvailability: Record<string, boolean> = {};
    for (const result of checks) {
      if (result.status === "fulfilled") {
        const [monthKey, hasInfo] = result.value;
        nextAvailability[monthKey] = hasInfo;
      }
    }

    setMonthAvailability((prev) => ({ ...prev, ...nextAvailability }));
    setMonthPickerLoading(false);
  };

  const goToPreviousMonth = () => {
    if (monthOffset <= minimumOffset) return;
    setMonthOffset((prev) => prev - 1);
  };

  const goToNextMonth = () => {
    if (monthOffset >= 0) return;
    setMonthOffset((prev) => prev + 1);
  };

  const selectMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-").map(Number);
    const nextOffset = (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
    setMonthOffset(nextOffset);
    setMonthPickerOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await transactionsApi.delete(id);
      toast.success("Lançamento removido");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover o lançamento"));
    }
  };

  // Compute spending per category
  const spentByCategory: Record<string, number> = {};
  if (summary) {
    for (const tx of summary.expenseTransactions) {
      spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] || 0) + tx.amount;
    }
  }

  const totalBudget = budget?.totalBudget ?? 0;
  const isBudgetReady = budget?.isReady ?? false;
  const totalSpent = summary?.totalExpense ?? 0;
  const remaining = totalBudget - totalSpent;
  const daysLeft = getDaysRemainingInMonth(currentMonth);
  const allocatedPct = budget?.categories.reduce((s, c) => s + c.percent, 0) ?? 0;
  const rulerReadyModel = buildMonthRulerReadyModel({
    monthKey: currentMonth,
    totalBudget,
    totalIncome: summary?.totalIncome ?? 0,
    totalExpense: totalSpent,
    remaining,
    daysLeft,
  });
  const expenseCategoryRows = (budget?.categories ?? [])
    .map((cat, index) => {
      const colorSlot = resolveCategoryColorSlot(cat, index);
      const kind = normalizeBudgetCategoryKind(cat.kind, cat.name);
      const allocated = catEur(cat, totalBudget);
      const spent = spentByCategory[cat.id] || 0;
      const catRemaining = allocated - spent;
      const usedPct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
      const over = spent > allocated + 0.009;
      const warning = !over && usedPct >= 80;
      const tone: "normal" | "warning" | "danger" = kind === "reserve"
        ? (over ? "danger" : "normal")
        : over ? "danger" : warning ? "warning" : "normal";
      const catTransactions = (summary?.expenseTransactions ?? [])
        .filter((tx) => tx.categoryId === cat.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        category: cat,
        color: getCatColor(colorSlot, index),
        allocated,
        spent,
        remaining: catRemaining,
        usedPct,
        transactions: catTransactions,
        movementsCount: catTransactions.length,
        urgencyRank: over ? 2 : warning ? 1 : 0,
        kind,
        initialOrder: index,
        tone,
      };
    })
    .sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === "expense" ? -1 : 1;
      if (left.kind === "expense" && right.kind === "expense") {
        if (right.urgencyRank !== left.urgencyRank) return right.urgencyRank - left.urgencyRank;
        if (Math.abs(right.usedPct - left.usedPct) > 0.01) return right.usedPct - left.usedPct;
        return left.category.name.localeCompare(right.category.name, "pt-PT");
      }
      if (left.initialOrder !== right.initialOrder) return left.initialOrder - right.initialOrder;
      return left.category.name.localeCompare(right.category.name, "pt-PT");
    });
  const activeExpenseCategory = expenseCategoryRows.find((row) => row.category.id === activeExpenseCategoryId) ?? null;
  const incomeTransactionsSorted = [...(summary?.incomeTransactions ?? [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const remainingValueClass = remaining < -0.009 ? "text-status-danger" : "text-status-success";
  const daysValueClass =
    rulerReadyModel.tone === "danger"
      ? "text-status-danger"
      : rulerReadyModel.tone === "warning"
        ? "text-status-warning"
        : "text-primary";
  const macroLine: ReactNode = (
    <span>
      Gasto <span className="font-semibold text-status-danger">{formatCurrency(totalSpent)}</span>
      <span className="mx-1 text-muted-foreground">·</span>
      Restante <span className={`font-semibold ${remainingValueClass}`}>{formatCurrency(remaining)}</span>
      <span className="mx-1 text-muted-foreground">·</span>
      <span className={`font-semibold ${daysValueClass}`}>{rulerReadyModel.daysLabel}</span>
    </span>
  );

  return (
    <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="month">
      <div className="-mx-4 flex items-center justify-between" data-tour="month-budget-select">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-none text-muted-foreground hover:bg-accent/60"
          onClick={goToPreviousMonth}
          aria-label="Ver mês anterior"
          disabled={monthOffset <= minimumOffset}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <button
          type="button"
          onClick={() => void openMonthPicker()}
          className="min-h-11 px-3 text-center"
          aria-label="Selecionar mês do orçamento"
        >
          <motion.span
            key={currentMonth}
            className="inline-flex items-center gap-1 text-[1.45rem] leading-none tracking-tight text-foreground"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {compactCurrentMonthLabel}
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.span>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-none text-muted-foreground hover:bg-accent/60"
          onClick={goToNextMonth}
          aria-label="Ver mês seguinte"
          disabled={monthOffset >= 0}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {canWriteFinancial ? (
        isBudgetReady ? (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div className="min-w-0">
              <Button
                data-tour="month-add-transaction"
                className="h-11 w-full rounded-xl border-0 bg-brand-gradient text-primary-foreground"
                onClick={() => {
                  setShowAddDialog(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Novo lançamento
              </Button>
            </div>
            <div className="shrink-0">
              <Button
                data-tour="month-budget-button"
                variant="ghost"
                className="h-11 rounded-xl px-3 text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => navigate(`/budget/${currentMonth}/edit`)}
              >
                Editar orçamento
              </Button>
            </div>
          </div>
        ) : (
          <Button
            data-tour="month-budget-button"
            className="h-11 w-full rounded-xl border-0 bg-brand-gradient text-primary-foreground transition-transform hover:opacity-95 active:scale-[0.99]"
            onClick={() => navigate(`/budget/${currentMonth}/edit`)}
          >
            <Settings2 className="w-4 h-4" />
            Criar orçamento
          </Button>
        )
      ) : null}

      {!isBudgetReady && canWriteFinancial ? (
        <section className="rounded-xl border border-warning/35 bg-warning-soft/80 px-1 py-1">
          <div className="px-2 py-1 text-center">
            <p className="text-xs text-warning-foreground">
              Ainda sem orçamento para este mês. Cria um orçamento para continuar.
            </p>
          </div>
        </section>
      ) : null}

      {!canWriteFinancial && (
          <section className="rounded-xl border border-border/70 bg-info-soft">
            <div className="p-3 text-xs text-info-foreground">
              Modo leitura ({getAccountRoleLabel(activeAccountRole)}): não tens permissão para criar ou editar
              lançamentos/orçamento.
            </div>
          </section>
        )}

      {loading ? (
        <div className="flex flex-col gap-5 px-1 pt-2">
          <div className="animate-pulse space-y-5" aria-hidden>
            <div className="mx-auto h-12 w-44 rounded bg-muted/70" />
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-muted/70" />
              <div className="h-3 w-full rounded bg-muted/70" />
            </div>
          </div>
          <MonthFinancialRuler state="loading" />
        </div>
      ) : loadError ? (
        <MonthFinancialRuler
          state="error"
          message={loadError}
          onRetry={() => {
            void loadData();
          }}
        />
      ) : summary && budget ? (
        <motion.div
          className="relative flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Budget Hero (flat) */}
          <motion.div
            className="px-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="mt-5 text-center">
              <p className="text-xs text-muted-foreground">Total do orçamento</p>
              <p className="mt-1 text-[1.45rem] leading-none tracking-tight text-foreground">{formatCurrency(totalBudget)}</p>
            </div>

            {isBudgetReady ? (
              <MonthFinancialRuler
                state="ready"
                progressPercent={rulerReadyModel.progressPercent}
                tone={rulerReadyModel.tone}
                dailyLabel="Disponível por dia"
                dailyValue={
                  rulerReadyModel.dailyValue === null
                    ? "—"
                    : `${formatCurrency(rulerReadyModel.dailyValue)}/dia`
                }
                macroLine={macroLine}
                statusLine={rulerReadyModel.statusText}
                hint={rulerReadyModel.hint}
              />
            ) : (
              <MonthFinancialRuler
                state="budget-not-ready"
                canWriteFinancial={canWriteFinancial}
                onEditBudget={() => navigate(`/budget/${currentMonth}/edit`)}
              />
            )}
          </motion.div>

          {/* ========== Unified Movements Section ========== */}
          <motion.div
            className={`mt-6 ${!isBudgetReady ? "pointer-events-none opacity-50 grayscale-[0.35] saturate-0" : ""}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {!isBudgetReady ? (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-[11px] text-muted-foreground ring-1 ring-border/70">
                <Lock className="h-3.5 w-3.5" />
                Movimentos desativados até criares orçamento
              </div>
            ) : null}
            <div className="space-y-6">
              <section className="space-y-3" data-tour="month-view-tabs">
                <div className="space-y-0.5">
                  <h3 className="text-sm text-foreground whitespace-nowrap">Categorias de despesa</h3>
                  <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                    Toque numa categoria para ver saídas
                  </p>
                </div>

                {budget.categories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-surface-soft/70 px-4 py-6 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 text-muted-foreground">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-foreground">Sem categorias de despesas neste mês</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cria um orçamento para começares a registar despesas.
                    </p>
                    <div className="mt-3 flex justify-center">
                      <Button
                        onClick={() => navigate(`/budget/${currentMonth}/edit`)}
                        disabled={!canWriteFinancial}
                        className="rounded-xl"
                      >
                        Criar orçamento
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="flex h-full">
                        {budget.categories.map((cat, ci) => (
                          <div
                            key={cat.id}
                            className={`h-full bg-gradient-to-r ${getCatColor(resolveCategoryColorSlot(cat, ci), ci).gradient} first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${cat.percent}%` }}
                            title={`${cat.name}: ${cat.percent}%`}
                          />
                        ))}
                      </div>
                    </div>
                    {Math.abs(allocatedPct - 100) > 0.01 ? (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-status-warning" />
                        <span className="text-[10px] text-status-warning">{allocatedPct.toFixed(0)}% alocado</span>
                      </div>
                    ) : null}

                    <div
                      className="divide-y divide-border/60 border-y border-border/60"
                      data-tour="month-categories"
                    >
                      {expenseCategoryRows.map((row) => (
                        <MonthExpenseCategoryRow
                          key={row.category.id}
                          name={row.category.name}
                          percentLabel={`${row.category.percent}%`}
                          spentLabel={formatCurrency(row.spent)}
                          allocatedLabel={formatCurrency(row.allocated)}
                          remainingLabel={formatCurrency(row.remaining)}
                          movementsLabel={`${row.movementsCount} mov.`}
                          progressPercent={row.usedPct}
                          tone={row.tone}
                          dotClassName={row.color.solid}
                          onOpen={() => setActiveExpenseCategoryId(row.category.id)}
                        />
                      ))}
                    </div>
                    {summary.expenseTransactions.length === 0 ? (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-muted-foreground">Ainda sem despesas neste mês.</p>
                        {canWriteFinancial ? (
                          <Button
                            variant="ghost"
                            className="h-10 rounded-xl px-3 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => setShowAddDialog(true)}
                            disabled={!isBudgetReady}
                          >
                            Adicionar lançamento
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </section>

              <section className="space-y-3 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm text-foreground">Receitas</h3>
                  <span className="text-xs text-muted-foreground">{formatCurrency(summary.totalIncome)}</span>
                </div>

                {incomeTransactionsSorted.length === 0 ? (
                  <div className="space-y-2 py-1">
                    <p className="text-xs text-muted-foreground">
                      Ainda não tens movimentos de receita neste mês.
                    </p>
                    {canWriteFinancial ? (
                      <Button
                        variant="ghost"
                        className="h-10 rounded-xl px-3 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => setShowAddDialog(true)}
                        disabled={!isBudgetReady}
                      >
                        Adicionar lançamento
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 border-y border-border/60">
                    {incomeTransactionsSorted.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-2 py-2.5">
                        {tx.origin === "recurring" ? (
                          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{tx.description}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        <span className="shrink-0 text-sm tabular-nums text-status-success">
                          +{formatCurrency(tx.amount)}
                        </span>
                        {tx.origin === "manual" && canWriteFinancial ? (
                          <button
                            type="button"
                            className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                            onClick={() => setPendingDeleteTransactionId(tx.id)}
                            aria-label="Remover lançamento"
                          >
                            <Trash2 className="mx-auto h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}

      <ResponsiveOverlay
        open={monthPickerOpen}
        onOpenChange={(nextOpen) => {
          setMonthPickerOpen(nextOpen);
        }}
      >
        <OverlayContent density="compact">
          <OverlayHeader>
            <OverlayTitle>Escolher mês</OverlayTitle>
          </OverlayHeader>
          <OverlayBody className="pt-1">
            <div className="max-h-[58vh] space-y-1 overflow-y-auto pr-1">
              {monthPickerLoading ? (
                <p className="py-2 text-xs text-muted-foreground">A carregar meses...</p>
              ) : null}
              {monthOptions.map((option) => {
                const isSelected = option.value === currentMonth;
                const hasInfo = monthAvailability[option.value] ?? false;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectMonth(option.value)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-accent text-foreground" : "hover:bg-accent/55"
                    } ${hasInfo ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="capitalize">{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </OverlayBody>
        </OverlayContent>
      </ResponsiveOverlay>

      <CategoryExpensesSheet
        open={Boolean(activeExpenseCategory)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveExpenseCategoryId(null);
        }}
        categoryName={activeExpenseCategory?.category.name ?? "Categoria"}
        transactions={activeExpenseCategory?.transactions ?? []}
        canWriteFinancial={canWriteFinancial}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onDeleteTransaction={(transactionId) => setPendingDeleteTransactionId(transactionId)}
        onViewAll={() => {
          if (!activeExpenseCategory) return;
          setActiveExpenseCategoryId(null);
          navigate(`/month/${currentMonth}/category/${activeExpenseCategory.category.id}/movements`);
        }}
      />

      <AddTransactionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        month={currentMonth}
        onAdded={loadData}
        expenseCategories={budget?.categories ?? []}
        incomeCategories={incomeCategories}
        canWriteFinancial={canWriteFinancial}
        onManageIncomeCategories={() => {
          setShowAddDialog(false);
          setShowIncomeCategoriesDialog(true);
        }}
        onManageRecurringRules={() => {
          setShowAddDialog(false);
          navigate("/recurring", { state: { from: "/" } });
        }}
        onRefreshIncomeCategories={reloadIncomeCategories}
      />
      <IncomeCategoriesDialog
        open={showIncomeCategoriesDialog}
        onClose={() => setShowIncomeCategoriesDialog(false)}
        categories={incomeCategories}
        canWriteFinancial={canWriteFinancial}
        onChanged={reloadIncomeCategories}
      />

      <ConfirmActionDialog
        open={Boolean(pendingDeleteTransactionId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingDeleteTransactionId(null);
          }
        }}
        title="Remover lançamento?"
        description="Esta ação não pode ser anulada."
        confirmLabel="Remover"
        onConfirm={async () => {
          if (!pendingDeleteTransactionId) return;
          await handleDelete(pendingDeleteTransactionId);
          setPendingDeleteTransactionId(null);
        }}
      />
    </div>
  );
}

// ============================================================
// ADD TRANSACTION DIALOG
// ============================================================
function AddTransactionDialog({
  open,
  onClose,
  month,
  onAdded,
  expenseCategories,
  incomeCategories,
  canWriteFinancial,
  onManageIncomeCategories,
  onManageRecurringRules,
  onRefreshIncomeCategories,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  onAdded: () => void;
  expenseCategories: BudgetCategory[];
  incomeCategories: IncomeCategory[];
  canWriteFinancial: boolean;
  onManageIncomeCategories: () => void;
  onManageRecurringRules: () => void;
  onRefreshIncomeCategories: () => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(String(new Date().getDate()));
  const [expenseCategoryId, setExpenseCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const [incomeCategoryId, setIncomeCategoryId] = useState(
    incomeCategories.find((category) => category.active)?.id ?? "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const firstExpenseCategory = expenseCategories[0]?.id ?? "";
    const hasSelectedExpense = expenseCategories.some((category) => category.id === expenseCategoryId);
    if (!hasSelectedExpense && expenseCategoryId !== firstExpenseCategory) {
      setExpenseCategoryId(firstExpenseCategory);
    }
  }, [expenseCategories, expenseCategoryId]);

  useEffect(() => {
    const activeIncomeCategories = incomeCategories.filter((category) => category.active);
    const firstActiveIncomeCategory = activeIncomeCategories[0]?.id ?? "";
    const hasSelectedIncome = activeIncomeCategories.some((category) => category.id === incomeCategoryId);
    if (!hasSelectedIncome && incomeCategoryId !== firstActiveIncomeCategory) {
      setIncomeCategoryId(firstActiveIncomeCategory);
    }
  }, [incomeCategories, incomeCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteFinancial) return;
    const selectedCategoryId = type === "income" ? incomeCategoryId : expenseCategoryId;
    if (!description || !amount || !selectedCategoryId) return;
    setSaving(true);
    try {
      const [yearPart, monthPart] = month.split("-");
      const daysInMonth = new Date(Number(yearPart), Number(monthPart), 0).getDate();
      const dayNum = Math.min(Math.max(parseInt(day, 10) || 1, 1), daysInMonth);
      await transactionsApi.create({
        month,
        date: `${month}-${String(dayNum).padStart(2, "0")}`,
        type,
        origin: "manual",
        description,
        amount: parseFloat(amount),
        categoryId: selectedCategoryId,
      });
      toast.success("Lançamento criado");
      onAdded();
      onClose();
      setDescription("");
      setAmount("");
    } catch (error) {
      if (
        type === "income"
        && isApiError(error)
        && (
          error.code === "INCOME_CATEGORY_REQUIRED"
          || error.code === "INCOME_CATEGORY_NOT_FOUND"
          || error.code === "INCOME_CATEGORY_INACTIVE"
        )
      ) {
        await onRefreshIncomeCategories();
        toast.error("A categoria de receita selecionada deixou de estar valida. Escolhe outra categoria.");
        return;
      }
      toast.error(getErrorMessage(error, "Não foi possível guardar o lançamento"));
    } finally {
      setSaving(false);
    }
  };

  const formContent = (mobileFooter = false) => (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SegmentedControlV3
        value={type}
        onChange={(value) => setType(value as "expense" | "income")}
        options={[
          { value: "expense", label: "Despesa" },
          { value: "income", label: "Receita" },
        ]}
        size="default"
        ariaLabel="Selecionar tipo de lançamento"
      />

      <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Descricao</label>
          <Input
            placeholder="Ex: Supermercado"
            className="h-11 rounded-xl border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Valor (EUR)</label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-10 h-11 rounded-xl border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Dia</label>
            <Input
              type="number"
              min="1"
              max="31"
              className="h-11 rounded-xl border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            {type === "income" ? "Categoria de receita" : "Categoria"}
          </label>
          <select
            className="w-full h-11 rounded-xl border border-border bg-input-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring-soft"
            value={type === "income" ? incomeCategoryId : expenseCategoryId}
            onChange={(e) => {
              if (type === "income") {
                setIncomeCategoryId(e.target.value);
                return;
              }
              setExpenseCategoryId(e.target.value);
            }}
          >
            {type === "income"
              ? incomeCategories
                  .filter((category) => category.active)
                  .map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))
              : expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.percent}%)
                  </option>
                ))}
          </select>
          {type === "income" && canWriteFinancial && (
            <button
              type="button"
              className="text-left text-xs font-medium text-primary hover:text-primary/80 hover:underline w-fit"
              onClick={onManageIncomeCategories}
            >
              Gerir categorias de receita
            </button>
          )}
        </div>

        {canWriteFinancial ? (
          <button
            type="button"
            className="text-left text-xs font-medium text-primary hover:text-primary/80 hover:underline w-fit"
            onClick={onManageRecurringRules}
          >
            Gerir recorrências automáticas
          </button>
        ) : null}
      </div>

      <div
        className={
          mobileFooter
            ? "sticky bottom-0 z-10 -mx-4 mt-1 flex gap-2 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
            : "mt-1 flex gap-2 pt-2"
        }
      >
        <Button
          type="button"
          variant="outline"
          className="rounded-xl flex-1 border-border bg-input-background text-foreground hover:bg-surface-soft"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            saving
            || !description
            || !amount
            || !canWriteFinancial
            || (type === "income" ? !incomeCategoryId : !expenseCategoryId)
          }
          className="rounded-xl flex-1 bg-brand-gradient text-primary-foreground border-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="right-auto left-1/2 w-[calc(100%-1rem)] max-w-[430px] -translate-x-1/2 max-h-[92vh] rounded-[20px] border border-border/80 bg-card/95 p-0 shadow-overlay backdrop-blur-xl"
        >
          <SheetHeader className="px-4 pt-3 pb-2 text-left">
            <SheetTitle className="text-base">Novo Lançamento</SheetTitle>
            <SheetDescription className="sr-only">
              Formulário para criar um novo lançamento manual.
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[calc(92vh-4.5rem)] overflow-y-auto px-4 pb-4">
            {formContent(true)}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="p-0 border border-border/80 bg-card/95 shadow-overlay backdrop-blur-xl rounded-[20px] overflow-hidden sm:max-w-lg">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="text-base text-foreground">Novo Lançamento</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para criar um novo lançamento manual.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5">
          {formContent(false)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncomeCategoriesDialog({
  open,
  onClose,
  categories,
  canWriteFinancial,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  categories: IncomeCategory[];
  canWriteFinancial: boolean;
  onChanged: () => Promise<void>;
}) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [pendingDeactivateCategory, setPendingDeactivateCategory] = useState<IncomeCategory | null>(null);

  const sortedCategories = [...categories].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-PT");
  });

  const handleCreate = async () => {
    const cleanName = newCategoryName.trim();
    if (!cleanName || !canWriteFinancial) return;
    setCreating(true);
    try {
      await incomeCategoriesApi.create(cleanName);
      toast.success("Categoria de receita criada");
      setNewCategoryName("");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível criar a categoria"));
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (category: IncomeCategory) => {
    if (!canWriteFinancial) return;
    const nextName = window.prompt("Novo nome da categoria", category.name)?.trim();
    if (!nextName || nextName === category.name) return;
    setBusyCategoryId(category.id);
    try {
      await incomeCategoriesApi.update(category.id, { name: nextName });
      toast.success("Categoria atualizada");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível renomear a categoria"));
    } finally {
      setBusyCategoryId(null);
    }
  };

  const handleToggleActive = async (category: IncomeCategory) => {
    if (!canWriteFinancial || category.isDefault || !category.active) return;
    setPendingDeactivateCategory(category);
  };

  const confirmDeactivateCategory = async () => {
    if (!pendingDeactivateCategory) return;
    setBusyCategoryId(pendingDeactivateCategory.id);
    try {
      await incomeCategoriesApi.update(pendingDeactivateCategory.id, { active: false });
      toast.success("Categoria desativada");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível atualizar a categoria"));
    } finally {
      setBusyCategoryId(null);
      setPendingDeactivateCategory(null);
    }
  };

  const handleActivate = async (category: IncomeCategory) => {
    if (!canWriteFinancial || category.isDefault || category.active) return;
    setBusyCategoryId(category.id);
    try {
      await incomeCategoriesApi.update(category.id, { active: true });
      toast.success("Categoria reativada");
      await onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível atualizar a categoria"));
    } finally {
      setBusyCategoryId(null);
    }
  };

  return (
    <>
      <ResponsiveOverlay open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <OverlayContent density="manager">
          <OverlayHeader>
            <OverlayTitle>Categorias de Receita</OverlayTitle>
          </OverlayHeader>
          <OverlayBody className="pt-0">
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-border bg-card p-2.5 flex items-center gap-2">
                <Input
                  className="h-10 rounded-xl border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
                  placeholder="Nova categoria..."
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleCreate();
                    }
                  }}
                  disabled={!canWriteFinancial || creating}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-11 w-11 rounded-xl bg-brand-gradient text-primary-foreground border-0"
                  aria-label="Criar categoria de receita"
                  onClick={() => {
                    void handleCreate();
                  }}
                  disabled={!canWriteFinancial || !newCategoryName.trim() || creating}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto pr-1">
                {sortedCategories.map((category) => {
                  const rowBusy = busyCategoryId === category.id;
                  return (
                    <Card key={category.id} className="p-2.5 border border-border bg-card shadow-none">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{category.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {category.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-info-soft text-info-foreground">
                                Default
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                category.active
                                  ? "bg-success-soft text-status-success"
                                  : "bg-surface-soft text-muted-foreground"
                              }`}
                            >
                              {category.active ? "Ativa" : "Inativa"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-lg px-2 text-xs border-border bg-input-background text-foreground hover:bg-surface-soft"
                            disabled={!canWriteFinancial || rowBusy}
                            onClick={() => {
                              void handleRename(category);
                            }}
                          >
                            Renomear
                          </Button>
                          {!category.isDefault && (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 rounded-lg px-2 text-xs border-border bg-input-background text-foreground hover:bg-surface-soft"
                              disabled={!canWriteFinancial || rowBusy}
                              onClick={() => {
                                if (category.active) {
                                  void handleToggleActive(category);
                                  return;
                                }
                                void handleActivate(category);
                              }}
                            >
                              {rowBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : category.active ? "Desativar" : "Ativar"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {sortedCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sem categorias de receita.
                  </p>
                )}
              </div>
            </div>
          </OverlayBody>

          <OverlayFooter sticky>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Fechar
            </Button>
          </OverlayFooter>
        </OverlayContent>
      </ResponsiveOverlay>

      <ConfirmActionDialog
        open={Boolean(pendingDeactivateCategory)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDeactivateCategory(null);
        }}
        title="Desativar categoria de receita?"
        description="Novos lançamentos não poderão usar esta categoria, mas os lançamentos antigos serão mantidos."
        confirmLabel="Desativar"
        onConfirm={confirmDeactivateCategory}
      />
    </>
  );
}
