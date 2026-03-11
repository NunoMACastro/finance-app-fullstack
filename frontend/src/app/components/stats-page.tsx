import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  PiggyBank,
  Award,
  AlertTriangle,
  BarChart3,
  Flame,
  ShieldCheck,
  Wallet,
  ChevronDown,
  ChevronUp,
  X,
  Info,
} from "lucide-react";
import { statsApi } from "../lib/api";
import { useAccount } from "../lib/account-context";
import { getErrorMessage } from "../lib/api-error";
import type { StatsSnapshot, BudgetVsActualItem, CategorySeriesMonthlyItem } from "../lib/types";

/* ── Helpers ───────────────────────────────────────── */

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);
}

function formatShortMonth(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "");
}

function formatFullMonth(monthKey: string) {
  const [y, m] = monthKey.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
}

const PIE_COLORS = [
  "#7dd3fc", "#86efac", "#fcd34d", "#fda4af", "#a5b4fc",
  "#fdba74", "#67e8f9", "#f0abfc", "#bef264",
];

/* ── Pure SVG Trend Chart ──────────────────────────── */

interface TrendDataPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
  name: string;
  savingsRate: number;
}

function SvgTrendChart({
  data,
  onDotClick,
  selectedIndex,
}: {
  data: TrendDataPoint[];
  onDotClick: (index: number) => void;
  selectedIndex: number | null;
}) {
  const W = 340;
  const H = 200;
  const PAD = { top: 20, right: 16, bottom: 28, left: 42 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap((d) => [d.income, d.expense, d.balance]);
  const maxV = Math.max(...allVals, 1);
  const minV = Math.min(...allVals, 0);
  const range = maxV - minV || 1;

  const x = (i: number) => PAD.left + (cw / Math.max(data.length - 1, 1)) * i;
  const y = (v: number) => PAD.top + ch - ((v - minV) / range) * ch;

  const polyline = (key: "income" | "expense" | "balance") =>
    data.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");

  // Y-axis ticks (4 ticks)
  const ticks = Array.from({ length: 4 }, (_, i) => minV + (range / 3) * i);

  // Area paths for income and expense fills
  const areaPath = (key: "income" | "expense") => {
    const pts = data.map((d, i) => `${x(i)},${y(d[key])}`);
    return `M${pts.join(" L")} L${x(data.length - 1)},${y(minV)} L${x(0)},${y(minV)} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 220 }}>
      <defs>
        <linearGradient id="incFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#86efac" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fda4af" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#fda4af" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={`tick-${i}`}>
          <line
            x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)}
            stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3"
          />
          <text x={PAD.left - 4} y={y(t) + 3} textAnchor="end" fill="#94a3b8" fontSize={9}>
            {(t / 1000).toFixed(1)}k
          </text>
        </g>
      ))}
      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={`xl-${i}`} x={x(i)} y={H - 4} textAnchor="middle" fill="#94a3b8" fontSize={9}>
          {d.name}
        </text>
      ))}
      {/* Area fills */}
      <path d={areaPath("income")} fill="url(#incFill)" />
      <path d={areaPath("expense")} fill="url(#expFill)" />
      {/* Lines */}
      <polyline points={polyline("income")} fill="none" stroke="#86efac" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={polyline("expense")} fill="none" stroke="#fda4af" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={polyline("balance")} fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
      {/* Interactive dots - only show on hover/selection */}
      {data.map((d, i) => (
        <g key={`dots-${i}`} className="cursor-pointer" onClick={() => onDotClick(i)}>
          {/* Invisible hit area */}
          <rect x={x(i) - 12} y={PAD.top - 4} width={24} height={ch + 8} fill="transparent" />
          {/* Selected column highlight */}
          {selectedIndex === i && (
            <rect
              x={x(i) - 10} y={PAD.top} width={20} height={ch}
              fill="rgba(56,189,248,0.06)" rx={4}
            />
          )}
          {/* Dots */}
          <circle cx={x(i)} cy={y(d.income)} r={selectedIndex === i ? 5 : 3} fill="#86efac" stroke="white" strokeWidth={2} />
          <circle cx={x(i)} cy={y(d.expense)} r={selectedIndex === i ? 5 : 3} fill="#fda4af" stroke="white" strokeWidth={2} />
          <circle cx={x(i)} cy={y(d.balance)} r={selectedIndex === i ? 4 : 2.5} fill="#38bdf8" stroke="white" strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
}

/* ── Pure CSS Donut Chart ──────────────────────────── */

interface DonutSlice {
  name: string;
  categoryId: string;
  value: number;
  percent: number;
  originalIndex: number;
}

function SvgDonutChart({
  data,
  activeIndex,
  highlightedCategory,
  onSliceClick,
}: {
  data: DonutSlice[];
  activeIndex: number | null;
  highlightedCategory: string | null;
  onSliceClick: (index: number) => void;
}) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 62;
  const innerR = 36;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  // Compute arcs
  const arcs = useMemo(() => {
    let cumAngle = -90; // start at top
    return data.map((slice, i) => {
      const angle = (slice.value / total) * 360;
      const gap = 1.5; // gap in degrees
      const startAngle = cumAngle + gap / 2;
      const endAngle = cumAngle + angle - gap / 2;
      cumAngle += angle;

      const isActive = activeIndex === i;
      const isDimmed = highlightedCategory && slice.categoryId !== highlightedCategory;
      const r1 = isActive ? innerR - 3 : innerR;
      const r2 = isActive ? outerR + 6 : outerR;

      return { ...slice, startAngle, endAngle, r1, r2, isActive, isDimmed, index: i };
    });
  }, [data, total, activeIndex, highlightedCategory]);

  const arcPath = (startDeg: number, endDeg: number, r1: number, r2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const sx1 = cx + r2 * Math.cos(toRad(startDeg));
    const sy1 = cy + r2 * Math.sin(toRad(startDeg));
    const ex1 = cx + r2 * Math.cos(toRad(endDeg));
    const ey1 = cy + r2 * Math.sin(toRad(endDeg));
    const sx2 = cx + r1 * Math.cos(toRad(endDeg));
    const sy2 = cy + r1 * Math.sin(toRad(endDeg));
    const ex2 = cx + r1 * Math.cos(toRad(startDeg));
    const ey2 = cy + r1 * Math.sin(toRad(startDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M${sx1},${sy1} A${r2},${r2} 0 ${large} 1 ${ex1},${ey1} L${sx2},${sy2} A${r1},${r1} 0 ${large} 0 ${ex2},${ey2} Z`;
  };

  const activeSlice = activeIndex !== null ? arcs[activeIndex] : null;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" style={{ maxWidth: 160, maxHeight: 160 }}>
      {arcs.map((arc) => (
        <path
          key={`arc-${arc.index}`}
          d={arcPath(arc.startAngle, arc.endAngle, arc.r1, arc.r2)}
          fill={PIE_COLORS[arc.index % PIE_COLORS.length]}
          opacity={arc.isDimmed ? 0.3 : 1}
          className="cursor-pointer transition-opacity duration-200"
          onClick={(e) => { e.stopPropagation(); onSliceClick(arc.index); }}
        />
      ))}
      {/* Active ring */}
      {activeSlice && (
        <path
          d={arcPath(activeSlice.startAngle, activeSlice.endAngle, outerR + 8, outerR + 11)}
          fill={PIE_COLORS[activeSlice.index % PIE_COLORS.length]}
          opacity={0.4}
        />
      )}
      {/* Center text */}
      {activeSlice ? (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#334155" fontSize={10} fontWeight={600}>
            {activeSlice.name}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fill="#64748b" fontSize={9}>
            {activeSlice.percent.toFixed(1)}%
          </text>
        </>
      ) : (
        <text x={cx} y={cy + 3} textAnchor="middle" fill="#94a3b8" fontSize={9}>
          Despesas
        </text>
      )}
    </svg>
  );
}

/* ── Month Detail Panel ──────────────────────────── */

function MonthDetailPanel({
  item,
  onClose,
}: {
  item: TrendDataPoint;
  onClose: () => void;
}) {
  const savingsRate = item.savingsRate;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className="overflow-hidden"
    >
      <Card className="border-0 shadow-md bg-sky-50/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-500" />
            <span className="text-sm capitalize">{formatFullMonth(item.month)}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-0.5">Receita</p>
            <p className="text-xs text-emerald-500 tabular-nums">{formatCurrency(item.income)}</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-0.5">Despesa</p>
            <p className="text-xs text-rose-400 tabular-nums">{formatCurrency(item.expense)}</p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-0.5">Saldo</p>
            <p className={`text-xs tabular-nums ${item.balance >= 0 ? "text-sky-500" : "text-rose-400"}`}>
              {formatCurrency(item.balance)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-2.5 text-center shadow-sm">
            <p className="text-[10px] text-muted-foreground mb-0.5">Poupanca</p>
            <p className={`text-xs tabular-nums ${savingsRate >= 20 ? "text-emerald-500" : savingsRate >= 10 ? "text-amber-500" : "text-rose-400"}`}>
              {savingsRate}%
            </p>
          </div>
        </div>
        {/* Mini bar showing income vs expense ratio */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Racio despesa/receita</span>
            <span className="tabular-nums">{item.income > 0 ? Math.round((item.expense / item.income) * 100) : 0}%</span>
          </div>
          <div className="h-2 w-full bg-white rounded-full overflow-hidden shadow-sm">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${item.income > 0 ? Math.min((item.expense / item.income) * 100, 100) : 0}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── Expandable Category Detail Card ─────────────── */

function CategoryDetailCard({
  item,
  index,
  isExpanded,
  onToggle,
  isHighlighted,
  monthlySeries,
}: {
  item: BudgetVsActualItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isHighlighted: boolean;
  monthlySeries: CategorySeriesMonthlyItem[];
}) {
  const pct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
  const over = item.actual > item.budgeted;
  const color = PIE_COLORS[index % PIE_COLORS.length];

  const categoryTrend = useMemo(
    () =>
      monthlySeries.map((entry) => ({
        label: formatShortMonth(entry.month),
        gasto: entry.actual,
        orc: entry.budgeted,
      })),
    [monthlySeries],
  );

  const maxCatVal = Math.max(...categoryTrend.flatMap((c) => [c.gasto, c.orc]), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + index * 0.04 }}
    >
      <Card
        className={`p-4 border-0 shadow-sm transition-all duration-300 cursor-pointer ${
          isHighlighted
            ? "shadow-lg ring-2 ring-sky-300/50 scale-[1.01]"
            : "hover:shadow-md"
        }`}
        onClick={onToggle}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-sm">{item.categoryName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                over ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {over ? "+" : ""}{formatCurrency(item.actual - item.budgeted)}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: over
                ? "linear-gradient(to right, #fda4af, #fb7185)"
                : `linear-gradient(to right, ${color}88, ${color})`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + index * 0.05 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Real: <span className="text-foreground">{formatCurrency(item.actual)}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Orcamento: <span className="text-foreground">{formatCurrency(item.budgeted)}</span>
          </span>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-muted">
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Utilizacao</p>
                    <p className={`text-xs tabular-nums ${over ? "text-rose-500" : "text-sky-500"}`}>
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Media/mes</p>
                    <p className="text-xs tabular-nums">
                      {formatCurrency(item.actual / Math.max(monthlySeries.length, 1))}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Disponivel</p>
                    <p className={`text-xs tabular-nums ${over ? "text-rose-500" : "text-emerald-500"}`}>
                      {formatCurrency(item.budgeted - item.actual)}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Tendencia mensal</p>
                {/* Pure CSS mini bar chart */}
                <div className="flex items-end gap-1.5" style={{ height: 64 }}>
                  {categoryTrend.map((ct, ci) => {
                    const orcH = (ct.orc / maxCatVal) * 56;
                    const gastoH = (ct.gasto / maxCatVal) * 56;
                    return (
                      <div key={`ct-${ci}`} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 56 }}>
                          <motion.div
                            className="rounded-t"
                            style={{ width: 6, backgroundColor: "#e2e8f0" }}
                            initial={{ height: 0 }}
                            animate={{ height: orcH }}
                            transition={{ duration: 0.5, delay: ci * 0.05 }}
                          />
                          <motion.div
                            className="rounded-t"
                            style={{ width: 6, backgroundColor: color, opacity: 0.8 }}
                            initial={{ height: 0 }}
                            animate={{ height: gastoH }}
                            transition={{ duration: 0.5, delay: ci * 0.05 + 0.05 }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{ct.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Main Stats Page
   ══════════════════════════════════════════════════════ */

export function StatsPage() {
  const { activeAccountId } = useAccount();
  const [period, setPeriod] = useState<"semester" | "year">("semester");
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Interactive state
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  // Refs for scroll-to
  const detailSectionRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadStats = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);

    // Reset interactive state on period/account change
    setActivePieIndex(null);
    setSelectedTrendIndex(null);
    setExpandedCards(new Set());
    setHighlightedCategory(null);

    try {
      const fetchPromise = period === "semester" ? statsApi.getSemester() : statsApi.getYear();
      const data = await fetchPromise;
      if (requestId !== requestIdRef.current) return;
      setStats(data);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setStats(null);
      setLoadError(getErrorMessage(error, "Nao foi possivel carregar estatisticas"));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [period, activeAccountId]);

  useEffect(() => {
    void loadStats();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadStats]);

  // Derived stats
  const derived = useMemo(() => {
    if (!stats) return null;

    const { trend, totals, budgetVsActual } = stats;
    const months = trend.length;

    const savingsRate = totals.totalIncome > 0
      ? ((totals.totalIncome - totals.totalExpense) / totals.totalIncome) * 100
      : 0;

    const avgDailySpend = totals.totalExpense / (months * 30);

    const bestMonth = trend.reduce((best, t) => t.balance > best.balance ? t : best, trend[0]);
    const worstMonth = trend.reduce((worst, t) => t.balance < worst.balance ? t : worst, trend[0]);

    const lastMonth = trend[trend.length - 1];
    const prevMonth = trend.length > 1 ? trend[trend.length - 2] : null;
    const momIncome = prevMonth && prevMonth.income > 0
      ? ((lastMonth.income - prevMonth.income) / prevMonth.income) * 100
      : 0;
    const momExpense = prevMonth && prevMonth.expense > 0
      ? ((lastMonth.expense - prevMonth.expense) / prevMonth.expense) * 100
      : 0;

    const totalActual = budgetVsActual.reduce((s, b) => s + b.actual, 0);
    const pieData: DonutSlice[] = budgetVsActual
      .map((b, i) => ({
        name: b.categoryName,
        categoryId: b.categoryId,
        value: b.actual,
        percent: totalActual > 0 ? (b.actual / totalActual) * 100 : 0,
        originalIndex: i,
      }))
      .sort((a, b) => b.value - a.value);

    const topCategories = [...budgetVsActual]
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 5);
    const maxCatSpend = topCategories.length > 0 ? topCategories[0].actual : 1;

    const overBudgetCount = budgetVsActual.filter(b => b.actual > b.budgeted).length;
    const avgMonthlyBalance = trend.reduce((s, t) => s + t.balance, 0) / months;

    let streak = 0;
    for (let i = trend.length - 1; i >= 0; i--) {
      if (trend[i].balance > 0) streak++;
      else break;
    }

    return {
      savingsRate, avgDailySpend, bestMonth, worstMonth,
      momIncome, momExpense, pieData, topCategories, maxCatSpend,
      overBudgetCount, avgMonthlyBalance, streak, months,
    };
  }, [stats]);

  // Handlers
  const handlePieClick = useCallback((_: unknown, index: number) => {
    if (!derived) return;
    const isDeselect = activePieIndex === index;
    setActivePieIndex(isDeselect ? null : index);

    if (!isDeselect) {
      const catId = derived.pieData[index].categoryId;
      setHighlightedCategory(catId);
      // auto-expand and scroll
      setExpandedCards((prev) => new Set(prev).add(catId));
      setTimeout(() => {
        const el = categoryRefs.current.get(catId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } else {
      setHighlightedCategory(null);
    }
  }, [activePieIndex, derived]);

  const handleDonutSliceClick = useCallback((index: number) => {
    handlePieClick(null, index);
  }, [handlePieClick]);

  const handlePieLegendClick = useCallback((catId: string, pieIndex: number) => {
    const isDeselect = highlightedCategory === catId;
    setActivePieIndex(isDeselect ? null : pieIndex);
    setHighlightedCategory(isDeselect ? null : catId);
    if (!isDeselect) {
      setExpandedCards((prev) => new Set(prev).add(catId));
      setTimeout(() => {
        const el = categoryRefs.current.get(catId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [highlightedCategory]);

  const handleTrendDotClick = useCallback((index: number) => {
    setSelectedTrendIndex((prev) => prev === index ? null : index);
  }, []);

  const toggleCard = useCallback((categoryId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const handleTopCategoryClick = useCallback((catId: string) => {
    const isDeselect = highlightedCategory === catId;
    setHighlightedCategory(isDeselect ? null : catId);
    // also highlight on pie
    if (derived && !isDeselect) {
      const pieIdx = derived.pieData.findIndex((p) => p.categoryId === catId);
      setActivePieIndex(pieIdx >= 0 ? pieIdx : null);
      setExpandedCards((prev) => new Set(prev).add(catId));
      setTimeout(() => {
        const el = categoryRefs.current.get(catId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } else {
      setActivePieIndex(null);
    }
  }, [highlightedCategory, derived]);

  const clearCategoryFilter = useCallback(() => {
    setHighlightedCategory(null);
    setActivePieIndex(null);
  }, []);

  /* ── Render ─────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-sm text-muted-foreground">A carregar estatisticas...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="border-amber-200 bg-amber-50/80 shadow-sm">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">{loadError}</p>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => {
              void loadStats();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  if (!stats || !derived) return null;

  const trendData: TrendDataPoint[] = stats.trend.map((t) => ({
    ...t,
    name: formatShortMonth(t.month),
    savingsRate: t.income > 0 ? Math.round(((t.income - t.expense) / t.income) * 100) : 0,
  }));
  const categorySeries = stats.categorySeries ?? [];

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground">Estatisticas</h2>
          <p className="text-sm text-muted-foreground">
            {period === "semester" ? "Ultimos 6 meses" : "Ultimos 12 meses"}
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "semester" | "year")}>
          <TabsList className="h-10 bg-muted/60 p-1" data-tour="stats-period-tabs">
            <TabsTrigger value="semester" className="rounded-xl px-3">6M</TabsTrigger>
            <TabsTrigger value="year" className="rounded-xl px-3">12M</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Active category filter indicator */}
      <AnimatePresence>
        {highlightedCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between bg-sky-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[
                      derived.pieData.findIndex((p) => p.categoryId === highlightedCategory) % PIE_COLORS.length
                    ] || PIE_COLORS[0],
                  }}
                />
                <span className="text-xs text-sky-700">
                  Filtro: {derived.pieData.find((p) => p.categoryId === highlightedCategory)?.name}
                </span>
              </div>
              <button
                onClick={clearCategoryFilter}
                className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center hover:bg-sky-200 transition-colors"
              >
                <X className="w-3 h-3 text-sky-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Savings Rate Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden border-0 shadow-xl shadow-sky-200/20">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-cyan-300 to-teal-300" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
          <div className="relative p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white text-sm">Taxa de Poupanca</h3>
                <p className="text-white/70 text-xs">Percentagem do rendimento poupado</p>
              </div>
            </div>
            <div className="flex items-center gap-5 mb-4">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="white" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${Math.max(derived.savingsRate, 0) * 0.9738} 100`}
                    initial={{ strokeDasharray: "0 100" }}
                    animate={{ strokeDasharray: `${Math.max(derived.savingsRate, 0) * 0.9738} 100` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm tabular-nums">
                    {derived.savingsRate >= 0 ? Math.round(derived.savingsRate) : 0}%
                  </span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-white/60 mb-0.5">Media/dia</p>
                  <p className="text-white text-xs tabular-nums">{formatCurrency(derived.avgDailySpend)}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-white/60 mb-0.5">Saldo medio</p>
                  <p className="text-white text-xs tabular-nums">{formatCurrency(derived.avgMonthlyBalance)}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-white/60 mb-0.5">Sequencia +</p>
                  <p className="text-white text-xs tabular-nums">{derived.streak} {derived.streak === 1 ? "mes" : "meses"}</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-white/60 mb-0.5">Acima orc.</p>
                  <p className="text-white text-xs tabular-nums">{derived.overBudgetCount} cat.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Totals Row with MoM */}
      <motion.div
        className="grid grid-cols-1 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="p-4 border-0 shadow-md">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center mb-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Receitas</p>
          <p className="text-sm text-emerald-500 tabular-nums">{formatCurrency(stats.totals.totalIncome)}</p>
          {derived.momIncome !== 0 && (
            <div className={`flex items-center gap-0.5 mt-1 ${derived.momIncome >= 0 ? "text-emerald-500" : "text-rose-400"}`}>
              {derived.momIncome >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-[10px] tabular-nums">{derived.momIncome >= 0 ? "+" : ""}{derived.momIncome.toFixed(1)}%</span>
            </div>
          )}
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center mb-2">
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Despesas</p>
          <p className="text-sm text-rose-400 tabular-nums">{formatCurrency(stats.totals.totalExpense)}</p>
          {derived.momExpense !== 0 && (
            <div className={`flex items-center gap-0.5 mt-1 ${derived.momExpense <= 0 ? "text-emerald-500" : "text-rose-400"}`}>
              {derived.momExpense <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              <span className="text-[10px] tabular-nums">{derived.momExpense >= 0 ? "+" : ""}{derived.momExpense.toFixed(1)}%</span>
            </div>
          )}
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center mb-2 ${stats.totals.balance >= 0 ? "bg-sky-100" : "bg-rose-100"}`}>
            {stats.totals.balance >= 0 ? (
              <TrendingUp className="w-4 h-4 text-sky-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-0.5">Saldo</p>
          <p className={`text-sm tabular-nums ${stats.totals.balance >= 0 ? "text-sky-500" : "text-rose-400"}`}>
            {formatCurrency(stats.totals.balance)}
          </p>
        </Card>
      </motion.div>

      {/* Best / Worst Month */}
      <motion.div
        className="grid grid-cols-1 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <Card className="p-4 border-0 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-xs text-muted-foreground">Melhor mes</span>
          </div>
          <p className="text-sm capitalize">{formatFullMonth(derived.bestMonth.month)}</p>
          <p className="text-xs text-emerald-500 tabular-nums mt-0.5">+{formatCurrency(derived.bestMonth.balance)}</p>
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <span className="text-xs text-muted-foreground">Pior mes</span>
          </div>
          <p className="text-sm capitalize">{formatFullMonth(derived.worstMonth.month)}</p>
          <p className={`text-xs tabular-nums mt-0.5 ${derived.worstMonth.balance >= 0 ? "text-emerald-500" : "text-rose-400"}`}>
            {derived.worstMonth.balance >= 0 ? "+" : ""}{formatCurrency(derived.worstMonth.balance)}
          </p>
        </Card>
      </motion.div>

      {/* Trend Chart - Interactive (Pure SVG) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        data-tour="stats-trend-chart"
      >
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
                </div>
                Tendencia Mensal
              </div>
              <span className="text-[10px] text-muted-foreground">Toca num ponto para detalhes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SvgTrendChart
              data={trendData}
              onDotClick={handleTrendDotClick}
              selectedIndex={selectedTrendIndex}
            />
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-300" />
                <span className="text-xs text-muted-foreground">Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-300" />
                <span className="text-xs text-muted-foreground">Despesas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-0.5 bg-sky-400 rounded" />
                <span className="text-xs text-muted-foreground">Saldo</span>
              </div>
            </div>

            {/* Month detail panel on dot click */}
            <AnimatePresence>
              {selectedTrendIndex !== null && trendData[selectedTrendIndex] && (
                <MonthDetailPanel
                  item={trendData[selectedTrendIndex]}
                  onClose={() => setSelectedTrendIndex(null)}
                />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Savings Rate Trend (Pure CSS bars) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              </div>
              Taxa de Poupanca Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2" style={{ height: 130 }}>
              {trendData.map((entry, index) => {
                const rate = Math.max(entry.savingsRate, 0);
                const maxRate = Math.max(...trendData.map((d) => Math.max(d.savingsRate, 0)), 1);
                const barH = (rate / maxRate) * 100;
                const barColor = rate >= 20 ? "#86efac" : rate >= 10 ? "#fcd34d" : "#fda4af";
                return (
                  <div key={`sr-${index}`} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] tabular-nums text-muted-foreground">{rate}%</span>
                    <div className="w-full flex justify-center" style={{ height: 90 }}>
                      <div className="flex items-end h-full">
                        <motion.div
                          className="rounded-t-md"
                          style={{ width: 22, backgroundColor: barColor }}
                          initial={{ height: 0 }}
                          animate={{ height: `${barH}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 + index * 0.04 }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{entry.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-300" />
                <span className="text-[10px] text-muted-foreground">&ge;20%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-300" />
                <span className="text-[10px] text-muted-foreground">10-20%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-300" />
                <span className="text-[10px] text-muted-foreground">&lt;10%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Expense Distribution Donut - Interactive (Pure SVG) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
                </div>
                Distribuicao de Despesas
              </div>
              <span className="text-[10px] text-muted-foreground">Toca numa fatia</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3">
              <div className="w-full flex justify-center">
                <SvgDonutChart
                  data={derived.pieData}
                  activeIndex={activePieIndex}
                  highlightedCategory={highlightedCategory}
                  onSliceClick={handleDonutSliceClick}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                {derived.pieData.map((item, i) => (
                  <button
                    key={item.categoryId}
                    className={`flex items-center gap-2 text-left rounded-lg px-1.5 py-1 transition-all ${
                      highlightedCategory === item.categoryId
                        ? "bg-sky-50 scale-[1.02]"
                        : highlightedCategory
                          ? "opacity-40"
                          : "hover:bg-muted/40"
                    }`}
                    onClick={() => handlePieLegendClick(item.categoryId, i)}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[11px] text-muted-foreground truncate flex-1">{item.name}</span>
                    <span className="text-[11px] tabular-nums">{item.percent.toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active slice detail */}
            <AnimatePresence>
              {activePieIndex !== null && derived.pieData[activePieIndex] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-muted">
                    {(() => {
                      const p = derived.pieData[activePieIndex];
                      const bva = stats.budgetVsActual.find(b => b.categoryId === p.categoryId);
                      return (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Total gasto</p>
                            <p className="text-xs tabular-nums">{formatCurrency(p.value)}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Orcamento</p>
                            <p className="text-xs tabular-nums">{bva ? formatCurrency(bva.budgeted) : "\u2014"}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Diferenca</p>
                            <p className={`text-xs tabular-nums ${bva && bva.actual > bva.budgeted ? "text-rose-500" : "text-emerald-500"}`}>
                              {bva ? formatCurrency(bva.budgeted - bva.actual) : "\u2014"}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Spending Categories - Clickable */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
              </div>
              Top Categorias de Despesa
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {derived.topCategories.map((cat, i) => {
              const barPct = (cat.actual / derived.maxCatSpend) * 100;
              const overBudget = cat.actual > cat.budgeted;
              const isActive = highlightedCategory === cat.categoryId;
              const isDimmed = highlightedCategory && !isActive;
              return (
                <motion.div
                  key={cat.categoryId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className={`cursor-pointer rounded-lg px-1 py-0.5 transition-all ${
                    isActive ? "bg-sky-50/80 scale-[1.01]" : isDimmed ? "opacity-35" : "hover:bg-muted/30"
                  }`}
                  onClick={() => handleTopCategoryClick(cat.categoryId)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground w-4 text-right">{i + 1}.</span>
                      <span className="text-sm">{cat.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums">{formatCurrency(cat.actual)}</span>
                      {overBudget && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-500">
                          +{Math.round(((cat.actual - cat.budgeted) / cat.budgeted) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.25 + i * 0.06 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {/* Budget vs Actual Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        data-tour="stats-budget-actual"
      >
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-sky-500" />
              </div>
              Orcamento vs Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {stats.budgetVsActual.map((b, i) => {
                const maxVal = Math.max(b.budgeted, b.actual, 1);
                const budgetPct = (b.budgeted / maxVal) * 100;
                const actualPct = (b.actual / maxVal) * 100;
                const over = b.actual > b.budgeted;
                return (
                  <div key={b.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{b.categoryName}</span>
                      <span className={`text-[10px] tabular-nums ${over ? "text-rose-500" : "text-emerald-500"}`}>
                        {over ? "+" : ""}{formatCurrency(b.actual - b.budgeted)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-6">Orc.</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-sky-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${budgetPct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: 0.22 + i * 0.04 }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right">{formatCurrency(b.budgeted)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-6">Real</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${over ? "bg-rose-300" : "bg-amber-300"}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${actualPct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 + i * 0.04 }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right">{formatCurrency(b.actual)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-sky-300" />
                <span className="text-xs text-muted-foreground">Orcamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-300" />
                <span className="text-xs text-muted-foreground">Real</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Budget vs Actual Detail Cards - Expandable */}
      <motion.div
        ref={detailSectionRef}
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-foreground text-sm">Detalhe por Categoria</h3>
          <span className="text-[10px] text-muted-foreground">Toca para expandir</span>
        </div>
        {stats.budgetVsActual.map((item, i) => (
          <div
            key={item.categoryId}
            ref={(el) => {
              if (el) categoryRefs.current.set(item.categoryId, el);
            }}
          >
            <CategoryDetailCard
              item={item}
              index={i}
              isExpanded={expandedCards.has(item.categoryId)}
              onToggle={() => toggleCard(item.categoryId)}
              isHighlighted={highlightedCategory === item.categoryId}
              monthlySeries={
                categorySeries.find((series) => series.categoryId === item.categoryId)?.monthly ?? []
              }
            />
          </div>
        ))}
      </motion.div>

      {/* Forecast */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="relative overflow-hidden border-0 shadow-xl shadow-sky-200/20">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-cyan-300 to-teal-300" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white text-sm">Projecao Proximo Mes</h3>
                <p className="text-white/70 text-xs">Media movel dos ultimos 3 meses</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-[11px] text-white/70 mb-1">Receita</p>
                <p className="text-white text-sm tabular-nums">{formatCurrency(stats.forecast.projectedIncome)}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
                <p className="text-[11px] text-white/70 mb-1">Despesa</p>
                <p className="text-white text-sm tabular-nums">{formatCurrency(stats.forecast.projectedExpense)}</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/30">
                <p className="text-[11px] text-white/70 mb-1">Saldo</p>
                <p className={`text-sm tabular-nums ${stats.forecast.projectedBalance >= 0 ? "text-white" : "text-rose-100"}`}>
                  {formatCurrency(stats.forecast.projectedBalance)}
                </p>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs text-white/80">Taxa poupanca projetada</span>
              </div>
              <span className="text-sm text-white tabular-nums">
                {stats.forecast.projectedIncome > 0
                  ? Math.round(((stats.forecast.projectedIncome - stats.forecast.projectedExpense) / stats.forecast.projectedIncome) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
