import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
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
import { transactionsApi, budgetApi, resolveCategoryName } from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { useAccount } from "../lib/account-context";
import type { MonthSummary, MonthBudget, Transaction, BudgetCategory, BudgetTemplate } from "../lib/types";
import { toast } from "sonner";

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
  { text: "text-violet-500", bar: "[&>div]:bg-violet-400", lightBg: "from-violet-100 to-purple-100", gradient: "from-violet-400 to-purple-400" },
  { text: "text-pink-400", bar: "[&>div]:bg-pink-300", lightBg: "from-pink-100 to-rose-100", gradient: "from-pink-300 to-rose-300" },
  { text: "text-emerald-400", bar: "[&>div]:bg-emerald-300", lightBg: "from-emerald-100 to-teal-100", gradient: "from-emerald-300 to-teal-300" },
  { text: "text-amber-400", bar: "[&>div]:bg-amber-300", lightBg: "from-amber-100 to-yellow-100", gradient: "from-amber-300 to-yellow-300" },
  { text: "text-sky-400", bar: "[&>div]:bg-sky-300", lightBg: "from-sky-100 to-blue-100", gradient: "from-sky-300 to-blue-300" },
  { text: "text-orange-400", bar: "[&>div]:bg-orange-300", lightBg: "from-orange-100 to-peach-100", gradient: "from-orange-300 to-amber-300" },
  { text: "text-cyan-400", bar: "[&>div]:bg-cyan-300", lightBg: "from-cyan-100 to-sky-100", gradient: "from-cyan-300 to-sky-300" },
  { text: "text-rose-400", bar: "[&>div]:bg-rose-300", lightBg: "from-rose-100 to-pink-100", gradient: "from-rose-300 to-pink-300" },
  { text: "text-indigo-400", bar: "[&>div]:bg-indigo-300", lightBg: "from-indigo-100 to-violet-100", gradient: "from-indigo-300 to-violet-300" },
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
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"expenses" | "income">("expenses");
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);

  const currentMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryData, budgetData] = await Promise.all([
        transactionsApi.getMonthSummary(currentMonth),
        budgetApi.get(currentMonth),
      ]);
      setSummary(summaryData);
      setBudget(budgetData);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Nao foi possivel carregar os dados do mes"));
      setSummary(null);
      setBudget(null);
    } finally {
      setLoading(false);
    }
  }, [activeAccountId, currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const templates = await budgetApi.getTemplates();
        if (!cancelled) {
          setBudgetTemplates(templates);
        }
      } catch {
        if (!cancelled) {
          setBudgetTemplates([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await transactionsApi.delete(id);
      toast.success("Lancamento removido");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Nao foi possivel remover o lancamento"));
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
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-sky-50" onClick={() => setMonthOffset((p) => p - 1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <motion.h2 key={currentMonth} className="capitalize text-foreground" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {getMonthLabel(currentMonth)}
        </motion.h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-sky-50" onClick={() => setMonthOffset((p) => p + 1)} disabled={monthOffset >= 0}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2">
        <Button
          data-tour="month-add-transaction"
          className="flex-1 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 text-white border-0 shadow-md shadow-sky-200/30 h-10"
          onClick={() => {
            if (!canWriteFinancial) return;
            if (isBudgetReady) {
              setShowAddDialog(true);
              return;
            }
            setShowBudgetEditor(true);
          }}
          disabled={!isBudgetReady || !canWriteFinancial}
        >
          <Plus className="w-4 h-4" />
          Novo lancamento
        </Button>
        <Button
          data-tour="month-budget-button"
          variant="outline"
          className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50 h-10 px-4"
          onClick={() => setShowBudgetEditor(true)}
          disabled={!canWriteFinancial}
        >
          <Settings2 className="w-4 h-4" />
          {isBudgetReady ? "Orcamento" : "Criar orcamento"}
        </Button>
      </div>

      {!canWriteFinancial && (
          <Card className="border-sky-100 bg-sky-50/60 shadow-sm">
            <div className="p-3 text-xs text-sky-700">
              Modo leitura ({getAccountRoleLabel(activeAccountRole)}): nao tens permissao para criar ou editar
              lancamentos/orcamento.
            </div>
          </Card>
        )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-sm text-muted-foreground">A carregar...</span>
          </div>
        </div>
      ) : loadError ? (
        <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">{loadError}</p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
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
              <Card className="border-amber-200 bg-amber-50/70 shadow-sm">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-amber-800">Cria primeiro um orcamento mensal</p>
                      <p className="text-xs text-amber-700/80 mt-0.5">
                        Os lancamentos manuais ficam desbloqueados quando tiveres categorias a 100%.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                    onClick={() => setShowBudgetEditor(true)}
                  >
                    Criar
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Budget Hero Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-sky-200/20">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-cyan-300 to-teal-300" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-white/80" />
                  <span className="text-sm text-white/80">Orcamento do Mes</span>
                </div>
                <p className="text-3xl text-white tracking-tight">
                  {formatCurrency(totalBudget)}
                </p>

                {/* Progress bar */}
                <div className="mt-4 mb-3">
                  <div className="h-2.5 w-full bg-white/30 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${remaining >= 0 ? "bg-white/80" : "bg-rose-200"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${spentPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-white/70">Gasto: {formatCurrency(totalSpent)}</span>
                    <span className="text-xs text-white/70">Restante: {formatCurrency(Math.max(remaining, 0))}</span>
                  </div>
                </div>

                {/* Daily budget + balance row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <CalendarDays className="w-3.5 h-3.5 text-white/70" />
                      <p className="text-[11px] text-white/70">Orcamento/dia</p>
                    </div>
                    <p className={`text-white tabular-nums ${dailyBudget <= 0 ? "text-rose-100" : ""}`}>
                      {daysLeft > 0 ? formatCurrency(dailyBudget) : "--"}
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5">{daysLeft} dias restantes</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      {remaining >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-100" />
                      )}
                      <p className="text-[11px] text-white/70">Saldo</p>
                    </div>
                    <p className={`tabular-nums ${remaining >= 0 ? "text-white" : "text-rose-100"}`}>
                      {formatCurrency(remaining)}
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {remaining >= 0 ? "Dentro do orcamento" : "Acima do orcamento"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Income / Expense summary pills */}
          <motion.div className="grid grid-cols-2 gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-3.5 border-0 shadow-md flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Receitas</p>
                <p className="text-emerald-500 tabular-nums tracking-tight">{formatCurrency(summary.totalIncome)}</p>
              </div>
            </Card>
            <Card className="p-3.5 border-0 shadow-md flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-4 h-4 text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Despesas</p>
                <p className="text-rose-400 tabular-nums tracking-tight">{formatCurrency(summary.totalExpense)}</p>
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
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setViewTab("expenses")}
                >
                  Despesas
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    viewTab === "income"
                      ? "bg-white text-foreground shadow-sm"
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
                      <p className="text-sm text-center">Sem categorias de despesas neste mes</p>
                      <p className="text-xs text-muted-foreground/70 text-center mt-1">
                        Cria um orcamento para começares a registar despesas.
                      </p>
                    </div>
                  ) : summary.expenseTransactions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-center">
                      <p className="text-sm text-foreground">Sem despesas neste periodo</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ainda nao tens movimentos de despesa neste mes.
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
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] text-amber-600">{allocatedPct.toFixed(0)}% alocado</span>
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
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color.lightBg} flex items-center justify-center shrink-0`}>
                              <Tag className={`w-3.5 h-3.5 ${color.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-foreground">{cat.name}</span>
                                  <span className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded-full">{cat.percent}%</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs tabular-nums ${over ? "text-red-600" : "text-muted-foreground"}`}>
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
                                <span className={`text-[10px] ${over ? "text-red-500" : "text-muted-foreground/60"}`}>
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
                                          <span className="text-xs text-red-600 tabular-nums shrink-0">-{formatCurrency(tx.amount)}</span>
                                          {tx.origin === "manual" && canWriteFinancial && (
                                            <button
                                              className="text-muted-foreground/70 active:scale-95 transition-transform shrink-0 p-1.5 rounded-lg"
                                              onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                                              aria-label="Remover lancamento"
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
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center shrink-0">
                              {tx.origin === "recurring" ? (
                                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{tx.description}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-muted-foreground">{formatDate(tx.date)}</span>
                                <span className="text-muted-foreground/30 text-[11px]">&bull;</span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {resolveCategoryName(tx.categoryId, budget.categories)}
                                </span>
                                {tx.origin === "recurring" && (
                                  <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full">
                                    Recorrente
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-emerald-600 tabular-nums shrink-0">
                              +{formatCurrency(tx.amount)}
                            </p>
                            {tx.origin === "manual" && canWriteFinancial && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive rounded-xl transition-all h-9 w-9"
                                  onClick={() => handleDelete(tx.id)}
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
        categories={budget?.categories ?? []}
        canWriteFinancial={canWriteFinancial}
      />

      {budget && canWriteFinancial && (
        <BudgetEditorDialog
          open={showBudgetEditor}
          onClose={() => setShowBudgetEditor(false)}
          budget={budget}
          templates={budgetTemplates}
          onSaved={(b) => { setBudget(b); setShowBudgetEditor(false); }}
        />
      )}
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
  categories,
  canWriteFinancial,
}: {
  open: boolean;
  onClose: () => void;
  month: string;
  onAdded: () => void;
  categories: BudgetCategory[];
  canWriteFinancial: boolean;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(String(new Date().getDate()));
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteFinancial) return;
    if (!description || !amount || !categoryId) return;
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
        categoryId,
      });
      toast.success("Lancamento criado");
      onAdded();
      onClose();
      setDescription("");
      setAmount("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Nao foi possivel guardar o lancamento"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lancamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${
                type === "expense"
                  ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setType("expense")}
            >
              <ArrowDownRight className="w-4 h-4" />
              Despesa
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${
                type === "income"
                  ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setType("income")}
            >
              <ArrowUpRight className="w-4 h-4" />
              Receita
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Descricao</label>
            <Input placeholder="Ex: Supermercado" className="h-11 rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">Valor (EUR)</label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="number" step="0.01" min="0" placeholder="0.00" className="pl-10 h-11 rounded-xl" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">Dia</label>
              <Input type="number" min="1" max="31" className="h-11 rounded-xl" value={day} onChange={(e) => setDay(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Categoria</label>
            <select
              className="w-full h-11 rounded-xl border border-input bg-input-background px-3 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.percent}%)</option>
              ))}
            </select>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !description || !amount || !canWriteFinancial}
              className="rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 text-white border-0 shadow-md shadow-sky-200/30"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// BUDGET EDITOR DIALOG
// ============================================================
function BudgetEditorDialog({
  open,
  onClose,
  budget,
  templates,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  budget: MonthBudget;
  templates: BudgetTemplate[];
  onSaved: (b: MonthBudget) => void;
}) {
  const [editBudget, setEditBudget] = useState<MonthBudget>(JSON.parse(JSON.stringify(budget)));
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatPercent, setNewCatPercent] = useState("");

  useEffect(() => {
    if (open) {
      setEditBudget(JSON.parse(JSON.stringify(budget)));
      setNewCatName("");
      setNewCatPercent("");
    }
  }, [open, budget]);

  const totalPct = editBudget.categories.reduce((s, c) => s + c.percent, 0);
  const pctDiff = totalPct - 100;

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await budgetApi.save(editBudget.month, {
        totalBudget: editBudget.totalBudget,
        categories: editBudget.categories,
      });
      toast.success("Orcamento guardado");
      onSaved(saved);
    } catch (error) {
      toast.error(getErrorMessage(error, "Nao foi possivel guardar o orcamento"));
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = (id: string, field: "name" | "percent", value: string | number) => {
    setEditBudget((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id ? { ...c, [field]: field === "percent" ? (parseFloat(value as string) || 0) : value } : c
      ),
    }));
  };

  const removeCategory = (id: string) => {
    setEditBudget((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: BudgetCategory = {
      id: `cat_new_${Date.now()}`,
      name: newCatName.trim(),
      percent: parseFloat(newCatPercent) || 0,
    };
    setEditBudget((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
    setNewCatName("");
    setNewCatPercent("");
  };

  const applyTemplate = (template: BudgetTemplate) => {
    setEditBudget((prev) => ({
      ...prev,
      categories: template.categories.map((category) => ({
        id: `${template.id}_${category.id}`,
        name: category.name,
        percent: category.percent,
      })),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orcamento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {/* Budget templates */}
          {templates.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted-foreground">Templates</label>
              <div className="grid grid-cols-1 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2 text-left hover:bg-sky-50 transition-colors"
                    onClick={() => applyTemplate(template)}
                  >
                    <p className="text-sm text-sky-700">{template.name}</p>
                    <p className="text-[10px] text-sky-600/80 mt-0.5">
                      {template.categories.map((c) => `${c.name} ${c.percent}%`).join(" • ")}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-xl border border-dashed border-muted-foreground/30 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setEditBudget((prev) => ({ ...prev, categories: [] }))}
                >
                  <p className="text-sm text-foreground">Personalizado</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Comecar com categorias vazias</p>
                </button>
              </div>
            </div>
          )}

          {/* Total Budget */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">Orcamento Total (EUR)</label>
            <div className="relative opacity-80">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                className="pl-10 h-11 rounded-xl"
                value={editBudget.totalBudget}
                readOnly
                disabled
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Valor calculado automaticamente pela soma das receitas do mes.
            </p>
          </div>

          {/* Percentage validation */}
          <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl ${
            Math.abs(pctDiff) < 0.01
              ? "bg-emerald-50 text-emerald-700"
              : pctDiff < 0
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}>
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

          {/* Percentage progress bar */}
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-colors ${
                Math.abs(pctDiff) < 0.01
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : totalPct > 100
                  ? "bg-gradient-to-r from-red-400 to-red-500"
                  : "bg-gradient-to-r from-amber-400 to-amber-500"
              }`}
              animate={{ width: `${Math.min(totalPct, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-2.5">
            <label className="text-sm text-muted-foreground">Categorias</label>
            {editBudget.categories.map((cat, ci) => (
              <div key={cat.id} className="rounded-xl border border-border/60 bg-muted/20 p-2.5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCatColor(ci).gradient} shrink-0`} />
                  <Input
                    className="flex-1 h-9 rounded-xl text-sm"
                    value={cat.name}
                    onChange={(e) => updateCategory(cat.id, "name", e.target.value)}
                    placeholder="Nome da categoria"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive rounded-xl h-9 w-9"
                    onClick={() => removeCategory(cat.id)}
                    aria-label={`Remover categoria ${cat.name}`}
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
                      value={cat.percent}
                      onChange={(e) => updateCategory(cat.id, "percent", e.target.value)}
                    />
                    <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                  </div>
                  <span className="text-xs text-muted-foreground text-right tabular-nums min-w-[90px]">
                    {formatCurrency(catEur(cat, editBudget.totalBudget))}
                  </span>
                </div>
              </div>
            ))}

            {/* Add new category */}
            <div className="rounded-xl border border-dashed border-border/80 p-2.5 flex flex-col gap-2 mt-1 pt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted shrink-0" />
                <Input
                  className="flex-1 h-9 rounded-xl text-sm"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nova categoria..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-sky-500 hover:bg-sky-50 rounded-xl h-9 w-9"
                  onClick={addCategory}
                  disabled={!newCatName.trim()}
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
                    onChange={(e) => setNewCatPercent(e.target.value)}
                    placeholder="0"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                  />
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
                <span className="text-xs text-muted-foreground text-right tabular-nums min-w-[90px]">
                  {formatCurrency(((parseFloat(newCatPercent) || 0) / 100) * editBudget.totalBudget)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-4">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 text-white border-0 shadow-md shadow-sky-200/30"
            onClick={handleSave}
            disabled={saving || editBudget.categories.length === 0 || Math.abs(pctDiff) > 0.01}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
