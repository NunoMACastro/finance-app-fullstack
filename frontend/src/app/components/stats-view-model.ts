import type {
  BudgetVsActualItem,
  CategorySeriesMonthlyItem,
  StatsSnapshot,
} from "../lib/types";

export type StatsDriverStatus = "ok" | "tight" | "exceeded";
export type StatsPulseTone = "neutral" | "success" | "warning" | "danger";

export interface StatsDriver {
  categoryId: string;
  categoryName: string;
  actual: number;
  budgeted: number;
  difference: number;
  usedPercent: number;
  status: StatsDriverStatus;
  monthlySeries: CategorySeriesMonthlyItem[];
}

export interface StatsViewModel {
  monthsCount: number;
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  savingsRate: number;
  budgetedTotal: number;
  budgetActualTotal: number;
  budgetDelta: number;
  budgetUsePercent: number;
  pulseTone: StatsPulseTone;
  trend: StatsSnapshot["trend"];
  topDrivers: StatsDriver[];
  drivers: StatsDriver[];
  forecast: StatsSnapshot["forecast"];
  latestMonth: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveDriverStatus(item: BudgetVsActualItem): StatsDriverStatus {
  if (item.actual > item.budgeted) return "exceeded";
  if (item.budgeted <= 0) return item.actual > 0 ? "exceeded" : "ok";
  const ratio = item.actual / item.budgeted;
  if (ratio >= 0.85) return "tight";
  return "ok";
}

function getDriverPriority(status: StatsDriverStatus): number {
  if (status === "exceeded") return 0;
  if (status === "tight") return 1;
  return 2;
}

function resolvePulseTone(
  budgetDelta: number,
  hasExceededDrivers: boolean,
  hasTightDrivers: boolean,
): StatsPulseTone {
  if (budgetDelta < 0 || hasExceededDrivers) return "danger";
  if (hasTightDrivers) return "warning";
  if (budgetDelta > 0) return "success";
  return "neutral";
}

export function buildStatsViewModel(snapshot: StatsSnapshot): StatsViewModel {
  const trend = snapshot.trend ?? [];
  const monthsCount = trend.length;
  const totalIncome = snapshot.totals.totalIncome;
  const totalExpense = snapshot.totals.totalExpense;
  const totalBalance = snapshot.totals.balance;
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const seriesByCategory = new Map<string, CategorySeriesMonthlyItem[]>(
    (snapshot.categorySeries ?? []).map((series) => [
      series.categoryId,
      series.monthly ?? [],
    ]),
  );

  const drivers: StatsDriver[] = (snapshot.budgetVsActual ?? []).map((item) => {
    const status = resolveDriverStatus(item);
    const usedPercent =
      item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : item.actual > 0 ? 100 : 0;

    return {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      actual: item.actual,
      budgeted: item.budgeted,
      difference: item.difference,
      usedPercent,
      status,
      monthlySeries: seriesByCategory.get(item.categoryId) ?? [],
    };
  });

  const sortedDrivers = [...drivers].sort((a, b) => {
    const priorityDiff = getDriverPriority(a.status) - getDriverPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    if (b.usedPercent !== a.usedPercent) return b.usedPercent - a.usedPercent;
    return a.categoryName.localeCompare(b.categoryName, "pt-PT");
  });

  const budgetedTotal = drivers.reduce((sum, item) => sum + item.budgeted, 0);
  const budgetActualTotal = drivers.reduce((sum, item) => sum + item.actual, 0);
  const budgetDelta = budgetedTotal - budgetActualTotal;
  const budgetUsePercent =
    budgetedTotal > 0 ? clamp((budgetActualTotal / budgetedTotal) * 100, 0, 160) : 0;

  const hasExceededDrivers = sortedDrivers.some((item) => item.status === "exceeded");
  const hasTightDrivers = sortedDrivers.some((item) => item.status === "tight");

  return {
    monthsCount,
    totalIncome,
    totalExpense,
    totalBalance,
    savingsRate,
    budgetedTotal,
    budgetActualTotal,
    budgetDelta,
    budgetUsePercent,
    pulseTone: resolvePulseTone(budgetDelta, hasExceededDrivers, hasTightDrivers),
    trend,
    topDrivers: sortedDrivers.slice(0, 3),
    drivers: sortedDrivers,
    forecast: snapshot.forecast,
    latestMonth: trend[trend.length - 1]?.month ?? null,
  };
}

export function getDriverStatusLabel(status: StatsDriverStatus): string {
  if (status === "exceeded") return "Excedido";
  if (status === "tight") return "Apertado";
  return "OK";
}

export function buildPulseInsight(
  model: StatsViewModel,
  formatCurrency: (value: number) => string,
): string {
  const top = model.topDrivers[0];

  if (model.budgetedTotal <= 0) {
    return "Ainda sem orçamento comparável neste período. Define limites para desbloquear recomendações melhores.";
  }

  if (model.budgetDelta < 0) {
    return `Acima do orçamento agregado em ${formatCurrency(
      Math.abs(model.budgetDelta),
    )}. Prioriza corte na categoria com maior pressão.`;
  }

  if (top?.status === "exceeded") {
    return `${top.categoryName} já excedeu o limite. Atua primeiro nesta categoria para recuperar margem.`;
  }

  if (top?.status === "tight") {
    return `${top.categoryName} está com margem apertada. Revê despesas variáveis antes de fechar o período.`;
  }

  if (model.savingsRate >= 20) {
    return "Ritmo muito sólido. Mantém consistência para fechar o período com boa margem.";
  }

  if (model.savingsRate >= 10) {
    return "Ritmo estável. Pequenos ajustes em despesas discricionárias podem melhorar a taxa de poupança.";
  }

  return "Ritmo frágil. Define um teto semanal para recuperar controlo das despesas.";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildInsightAliasMap(snapshot: StatsSnapshot): Map<string, string> {
  const map = new Map<string, string>();

  const expenseNameById = new Map(
    (snapshot.budgetVsActual ?? []).map((item) => [item.categoryId, item.categoryName]),
  );
  const expenseIds = Array.from(expenseNameById.keys()).sort((a, b) => a.localeCompare(b));
  expenseIds.forEach((categoryId, index) => {
    map.set(`C${index + 1}`, expenseNameById.get(categoryId) ?? `C${index + 1}`);
  });

  const incomeNameById = new Map(
    (snapshot.incomeByCategory ?? []).map((item) => [item.categoryId, item.categoryName]),
  );
  const incomeIds = Array.from(incomeNameById.keys()).sort((a, b) => a.localeCompare(b));
  incomeIds.forEach((categoryId, index) => {
    map.set(`I${index + 1}`, incomeNameById.get(categoryId) ?? `I${index + 1}`);
  });

  return map;
}

export function mapInsightAliasesToCategoryNames(snapshot: StatsSnapshot, insightText: string): string {
  const normalizedText = insightText.trim();
  if (!normalizedText) return normalizedText;

  const aliasEntries = Array.from(buildInsightAliasMap(snapshot).entries()).sort(
    (a, b) => b[0].length - a[0].length,
  );

  return aliasEntries.reduce((text, [alias, categoryName]) => {
    return text.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, "g"), categoryName);
  }, normalizedText);
}
