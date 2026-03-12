import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
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
  Wallet,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
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
  Tag,
  Percent,
  Sparkles,
} from "lucide-react";
import {
  transactionsApi,
  budgetApi,
  incomeCategoriesApi,
  resolveIncomeCategoryName,
} from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { isApiError } from "../lib/http-client";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { useAccount } from "../lib/account-context";
import type {
  MonthSummary,
  MonthBudget,
  BudgetCategory,
  IncomeCategory,
} from "../lib/types";
import { toast } from "sonner";
import { ConfirmActionDialog } from "./confirm-action-dialog";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function getMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

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

const CATEGORY_COLORS = [
  { text: "text-category-1", bar: "[&>div]:bg-category-solid-1", lightBg: "bg-category-soft-1", gradient: "bg-category-gradient-1" },
  { text: "text-category-2", bar: "[&>div]:bg-category-solid-2", lightBg: "bg-category-soft-2", gradient: "bg-category-gradient-2" },
  { text: "text-category-3", bar: "[&>div]:bg-category-solid-3", lightBg: "bg-category-soft-3", gradient: "bg-category-gradient-3" },
  { text: "text-category-4", bar: "[&>div]:bg-category-solid-4", lightBg: "bg-category-soft-4", gradient: "bg-category-gradient-4" },
  { text: "text-category-5", bar: "[&>div]:bg-category-solid-5", lightBg: "bg-category-soft-5", gradient: "bg-category-gradient-5" },
  { text: "text-category-6", bar: "[&>div]:bg-category-solid-6", lightBg: "bg-category-soft-6", gradient: "bg-category-gradient-6" },
  { text: "text-category-7", bar: "[&>div]:bg-category-solid-7", lightBg: "bg-category-soft-7", gradient: "bg-category-gradient-7" },
  { text: "text-category-8", bar: "[&>div]:bg-category-solid-8", lightBg: "bg-category-soft-8", gradient: "bg-category-gradient-8" },
  { text: "text-category-9", bar: "[&>div]:bg-category-solid-9", lightBg: "bg-category-soft-9", gradient: "bg-category-gradient-9" },
];

function getCatColor(index: number) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function catEur(cat: BudgetCategory, totalBudget: number): number {
  return (cat.percent / 100) * totalBudget;
}

// ============================================================
// MAIN PAGE
// ============================================================
export function MonthPage() {
  const { activeAccountId, activeAccountRole, canWriteFinancial } = useAccount();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const initialMonthOffset = (() => {
    const monthParam = searchParams.get("month");
    if (!monthParam || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) return 0;
    const [year, month] = monthParam.split("-").map(Number);
    return (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
  })();
  const [monthOffset, setMonthOffset] = useState(initialMonthOffset);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"expenses" | "income">("expenses");
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [showIncomeCategoriesDialog, setShowIncomeCategoriesDialog] = useState(false);
  const [pendingDeleteTransactionId, setPendingDeleteTransactionId] = useState<string | null>(null);

  const currentMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

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
    const queryMonth = searchParams.get("month");
    if (queryMonth === currentMonth) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("month", currentMonth);
    setSearchParams(nextParams, { replace: true });
  }, [currentMonth, searchParams, setSearchParams]);

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
  const dailyBudget = daysLeft > 0 ? remaining / daysLeft : 0;
  const spentPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const allocatedPct = budget?.categories.reduce((s, c) => s + c.percent, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Top bar: Month nav + actions */}
      <div className="flex items-center justify-between" data-tour="month-nav">
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent" onClick={() => setMonthOffset((p) => p - 1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <motion.h2 key={currentMonth} className="capitalize text-foreground" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {getMonthLabel(currentMonth)}
        </motion.h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent" onClick={() => setMonthOffset((p) => p + 1)} disabled={monthOffset >= 0}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2">
        <Button
          data-tour="month-add-transaction"
          className="flex-1 rounded-xl bg-brand-gradient text-primary-foreground border-0 shadow-card h-10"
          onClick={() => {
            if (!canWriteFinancial) return;
            if (isBudgetReady) {
              setShowAddDialog(true);
              return;
            }
            navigate(`/budget/${currentMonth}/edit`);
          }}
          disabled={!isBudgetReady || !canWriteFinancial}
        >
          <Plus className="w-4 h-4" />
          Novo lançamento
        </Button>
        <Button
          data-tour="month-budget-button"
          variant="outline"
          className="rounded-xl border-border text-primary hover:bg-accent h-10 px-4"
          onClick={() => navigate(`/budget/${currentMonth}/edit`)}
          disabled={!canWriteFinancial}
        >
          <Settings2 className="w-4 h-4" />
          {isBudgetReady ? "Orçamento" : "Criar orçamento"}
        </Button>
      </div>

      {!canWriteFinancial && (
          <Card className="border-border bg-info-soft shadow-sm">
            <div className="p-3 text-xs text-info-foreground">
              Modo leitura ({getAccountRoleLabel(activeAccountRole)}): não tens permissão para criar ou editar
              lançamentos/orçamento.
            </div>
          </Card>
        )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">A carregar...</span>
          </div>
        </div>
      ) : loadError ? (
        <Card className="border-warning/40 bg-warning-soft shadow-sm">
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-status-warning mt-0.5 shrink-0" />
              <p className="text-sm text-warning-foreground">{loadError}</p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl border-warning/60 text-status-warning hover:bg-warning/20"
              onClick={() => {
                void loadData();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : summary && budget ? (
        <motion.div className="flex flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {!isBudgetReady && canWriteFinancial && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-warning/40 bg-warning-soft shadow-sm">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-status-warning mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-warning-foreground">Cria primeiro um orçamento mensal</p>
                      <p className="text-xs text-warning-foreground/80 mt-0.5">
                        Os lançamentos manuais ficam desbloqueados quando tiveres categorias a 100%.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl bg-warning text-warning-foreground hover:bg-warning/90"
                    onClick={() => navigate(`/budget/${currentMonth}/edit`)}
                  >
                    Criar
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Budget Hero Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-card">
              <div className="absolute inset-0 bg-info-gradient" />
              <div className="absolute inset-0 bg-brand-gradient-soft opacity-30" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-primary-foreground/80" />
                  <span className="text-sm text-primary-foreground/80">Orçamento do Mês</span>
                </div>
                <p className="text-3xl text-primary-foreground tracking-tight">
                  {formatCurrency(totalBudget)}
                </p>

                {/* Progress bar */}
                <div className="mt-4 mb-3">
                  <div className="h-2.5 w-full bg-primary-foreground/30 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${remaining >= 0 ? "bg-primary-foreground/80" : "bg-danger-soft"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${spentPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-primary-foreground/70">Gasto: {formatCurrency(totalSpent)}</span>
                    <span className="text-xs text-primary-foreground/70">Restante: {formatCurrency(Math.max(remaining, 0))}</span>
                  </div>
                </div>

                {/* Daily budget + balance row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <CalendarDays className="w-3.5 h-3.5 text-primary-foreground/70" />
                      <p className="text-[11px] text-primary-foreground/70">Orçamento/dia</p>
                    </div>
                    <p className={`text-primary-foreground tabular-nums ${dailyBudget <= 0 ? "text-danger-soft" : ""}`}>
                      {daysLeft > 0 ? formatCurrency(dailyBudget) : "--"}
                    </p>
                    <p className="text-[10px] text-primary-foreground/50 mt-0.5">{daysLeft} dias restantes</p>
                  </div>
                  <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      {remaining >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-primary-foreground" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-danger-soft" />
                      )}
                      <p className="text-[11px] text-primary-foreground/70">Saldo</p>
                    </div>
                    <p className={`tabular-nums ${remaining >= 0 ? "text-primary-foreground" : "text-danger-soft"}`}>
                      {formatCurrency(remaining)}
                    </p>
                    <p className="text-[10px] text-primary-foreground/50 mt-0.5">
                      {remaining >= 0 ? "Dentro do orçamento" : "Acima do orçamento"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Income / Expense summary pills */}
          <motion.div className="grid grid-cols-2 gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-3.5 border-0 shadow-md flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success-soft flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-status-success" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Receitas</p>
                <p className="text-status-success tabular-nums tracking-tight">{formatCurrency(summary.totalIncome)}</p>
              </div>
            </Card>
            <Card className="p-3.5 border-0 shadow-md flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-danger-soft flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-4 h-4 text-status-danger" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Despesas</p>
                <p className="text-status-danger tabular-nums tracking-tight">{formatCurrency(summary.totalExpense)}</p>
              </div>
            </Card>
          </motion.div>

          {/* ========== Unified Movements Section ========== */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {/* Section header with view toggle */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground text-sm">Movimentos</h3>
              <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-0.5" data-tour="month-view-tabs">
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    viewTab === "expenses"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setViewTab("expenses")}
                >
                  Despesas
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    viewTab === "income"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setViewTab("income")}
                >
                  Receitas
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewTab === "expenses" ? (
                <motion.div
                  data-tour="month-categories"
                  key="expenses-view"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2"
                >
                  {budget.categories.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-muted-foreground">
                      <ShoppingCart className="w-10 h-10 mb-3 text-muted-foreground/20" />
                      <p className="text-sm text-center">Sem categorias de despesas neste mês</p>
                      <p className="text-xs text-muted-foreground/70 text-center mt-1">
                        Cria um orçamento para começares a registar despesas.
                      </p>
                    </div>
                  ) : summary.expenseTransactions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-center">
                      <p className="text-sm text-foreground">Sem despesas neste periodo</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ainda não tens movimentos de despesa neste mês.
                      </p>
                    </div>
                  ) : null}

                  {/* Distribution bar */}
                  {budget.categories.length > 0 && (
                    <div className="mb-1">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                        {budget.categories.map((cat, ci) => (
                          <div
                            key={cat.id}
                            className={`h-full bg-gradient-to-r ${getCatColor(ci).gradient} first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${cat.percent}%` }}
                            title={`${cat.name}: ${cat.percent}%`}
                          />
                        ))}
                      </div>
                      {Math.abs(allocatedPct - 100) > 0.01 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <AlertTriangle className="w-3 h-3 text-status-warning" />
                          <span className="text-[10px] text-status-warning">{allocatedPct.toFixed(0)}% alocado</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Budget categories with inline transactions */}
                  {budget.categories.map((cat, ci) => {
                    const allocated = catEur(cat, totalBudget);
                    const spent = spentByCategory[cat.id] || 0;
                    const catRemaining = allocated - spent;
                    const usedPct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                    const over = spent > allocated;
                    const color = getCatColor(ci);
                    const isExpanded = expandedCat === cat.id;
                    const catTransactions = summary.expenseTransactions
                      .filter(tx => tx.categoryId === cat.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: ci * 0.03 }}
                      >
                        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all">
                          {/* Category header */}
                          <button
                            className="w-full p-3 flex items-center gap-3 text-left"
                            onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                          >
                            <div className={`w-9 h-9 rounded-xl ${color.lightBg} flex items-center justify-center shrink-0`}>
                              <Tag className={`w-3.5 h-3.5 ${color.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-foreground">{cat.name}</span>
                                  <span className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded-full">{cat.percent}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs tabular-nums ${over ? "text-status-danger" : "text-muted-foreground"}`}>
                                    {formatCurrency(spent)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/40">/</span>
                                  <span className="text-xs text-muted-foreground/60 tabular-nums">{formatCurrency(allocated)}</span>
                                </div>
                              </div>
                              <Progress
                                value={usedPct}
                                className={`h-1.5 rounded-full ${over ? "[&>div]:bg-destructive" : color.bar}`}
                              />
                              <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] ${over ? "text-status-danger" : "text-muted-foreground/60"}`}>
                                  {over ? `+${formatCurrency(spent - allocated)} acima` : `${formatCurrency(catRemaining)} restante`}
                                </span>
                                {catTransactions.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground/40">
                                    {catTransactions.length} mov.
                                  </span>
                                )}
                              </div>
                            </div>
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                            </motion.div>
                          </button>

                          {/* Inline transactions */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 border-t border-border/50">
                                  {catTransactions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground/50 py-3 text-center">Sem despesas nesta categoria</p>
                                  ) : (
                                    <div className="flex flex-col mt-2 gap-0.5">
                                      {catTransactions.map((tx) => (
                                        <div
                                          key={tx.id}
                                          className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-muted/20"
                                        >
                                          {tx.origin === "recurring" ? (
                                            <RefreshCw className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                          ) : (
                                            <ArrowDownRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                          )}
                                          <span className="text-xs text-foreground truncate flex-1">{tx.description}</span>
                                          <span className="text-[10px] text-muted-foreground/40 shrink-0">{formatDate(tx.date)}</span>
                                          <span className="text-xs text-status-danger tabular-nums shrink-0">-{formatCurrency(tx.amount)}</span>
                                          {tx.origin === "manual" && canWriteFinancial && (
                                            <button
                                              className="text-muted-foreground/70 active:scale-95 transition-transform shrink-0 p-1.5 rounded-lg"
                                              onClick={(e) => { e.stopPropagation(); setPendingDeleteTransactionId(tx.id); }}
                                              aria-label="Remover lançamento"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                /* ===== Income view ===== */
                <motion.div
                  key="income-view"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2"
                >
                  {summary.incomeTransactions.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-muted-foreground">
                      <ShoppingCart className="w-10 h-10 mb-3 text-muted-foreground/20" />
                      <p className="text-sm">Sem receitas neste periodo</p>
                    </div>
                  ) : (
                    [...summary.incomeTransactions]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx, i) => (
                        <motion.div key={tx.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <Card className="p-3 flex-row items-center gap-3 border-0 shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-success-soft flex items-center justify-center shrink-0">
                              {tx.origin === "recurring" ? (
                                <RefreshCw className="w-3.5 h-3.5 text-status-success" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-status-success" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{tx.description}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-muted-foreground">{formatDate(tx.date)}</span>
                                <span className="text-muted-foreground/30 text-[11px]">&bull;</span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {resolveIncomeCategoryName(tx.categoryId, incomeCategories)}
                                </span>
                                {tx.origin === "recurring" && (
                                  <span className="text-[10px] bg-status-info-soft text-status-info px-1.5 py-0.5 rounded-full">
                                    Recorrente
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-status-success tabular-nums shrink-0">
                              +{formatCurrency(tx.amount)}
                            </p>
                            {tx.origin === "manual" && canWriteFinancial && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive rounded-xl transition-all h-9 w-9"
                                  onClick={() => setPendingDeleteTransactionId(tx.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </Card>
                        </motion.div>
                      ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend (only in expenses view) */}
            {viewTab === "expenses" && budget.categories.length > 0 && (
              <motion.div className="flex flex-wrap gap-x-3 gap-y-1 mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                {budget.categories.map((cat, ci) => (
                  <div key={cat.id} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${getCatColor(ci).gradient}`} />
                    <span className="text-[10px] text-muted-foreground/60">{cat.name}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      ) : null}

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
      <div className="flex gap-2 rounded-2xl border border-border bg-surface-soft p-1">
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
            type === "expense"
              ? "bg-card text-status-danger ring-1 ring-danger/25 shadow-sm"
              : "text-muted-foreground hover:bg-card"
          }`}
          onClick={() => setType("expense")}
        >
          <ArrowDownRight className="w-4 h-4" />
          Despesa
        </button>
        <button
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
            type === "income"
              ? "bg-card text-status-success ring-1 ring-success/25 shadow-sm"
              : "text-muted-foreground hover:bg-card"
          }`}
          onClick={() => setType("income")}
        >
          <ArrowUpRight className="w-4 h-4" />
          Receita
        </button>
      </div>

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
          className="rounded-xl flex-1 bg-brand-gradient text-primary-foreground border-0 shadow-card"
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
          className="right-auto left-1/2 w-[calc(100%-1rem)] max-w-[430px] -translate-x-1/2 max-h-[92vh] rounded-3xl border border-border/80 bg-card/95 p-0 shadow-overlay backdrop-blur-xl"
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
      <DialogContent className="p-0 border border-border/80 bg-card/95 shadow-overlay backdrop-blur-xl rounded-3xl overflow-hidden sm:max-w-lg">
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
                  className="h-10 w-10 rounded-xl bg-brand-gradient text-primary-foreground border-0 shadow-card"
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
