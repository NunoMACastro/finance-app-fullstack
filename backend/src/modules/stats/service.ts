import { BudgetModel } from "../../models/budget.model.js";
import { IncomeCategoryModel } from "../../models/income-category.model.js";
import { StatsSnapshotModel } from "../../models/stats-snapshot.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { lastNMonthsEndingAt, monthFromDate } from "../../lib/month.js";
import { Types } from "mongoose";
import { generateStatsInsight, type StatsAiInsight } from "./insight.service.js";

interface TrendItem {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface BudgetVsActualItem {
  categoryId: string;
  categoryName: string;
  categoryKind?: "expense" | "reserve";
  budgeted: number;
  actual: number;
  difference: number;
}

interface CategorySeriesMonthItem {
  month: string;
  budgeted: number;
  actual: number;
}

interface CategorySeriesItem {
  categoryId: string;
  categoryName: string;
  categoryKind?: "expense" | "reserve";
  monthly: CategorySeriesMonthItem[];
}

interface IncomeByCategoryItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
}

interface IncomeCategorySeriesMonthItem {
  month: string;
  amount: number;
}

interface IncomeCategorySeriesItem {
  categoryId: string;
  categoryName: string;
  monthly: IncomeCategorySeriesMonthItem[];
}

export interface StatsTotalsBreakdownDto {
  consumption: number;
  savings: number;
  unallocated: number;
  potentialSavings: number;
  rates: {
    savings: number;
    unallocated: number;
    potentialSavings: number;
  };
}

export interface StatsSnapshotDto {
  periodType: "semester" | "year";
  periodKey: string;
  totals: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  totalsBreakdown?: StatsTotalsBreakdownDto;
  trend: TrendItem[];
  budgetVsActual: BudgetVsActualItem[];
  categorySeries: CategorySeriesItem[];
  incomeByCategory: IncomeByCategoryItem[];
  incomeCategorySeries: IncomeCategorySeriesItem[];
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
    windowMonths: 3 | 6;
    sampleSize: number;
    confidence: "low" | "medium" | "high";
  };
  insight?: StatsAiInsight;
}

interface BudgetCompareDto {
  from: string;
  to: string;
  totals: {
    budgeted: number;
    actual: number;
    difference: number;
  };
  items: BudgetVsActualItem[];
}

function semesterKey(month: string): string {
  const yearStr = month.slice(0, 4);
  const monthStr = Number(month.slice(5, 7));
  const semester = monthStr <= 6 ? 1 : 2;
  return `${yearStr}-S${semester}`;
}

function monthsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function categoryMonthKey(categoryId: string, month: string): string {
  return `${categoryId}::${month}`;
}

function resolveRate(value: number, totalIncome: number): number {
  if (totalIncome <= 0) return 0;
  return (value / totalIncome) * 100;
}

export function buildTotalsBreakdown(
  totals: StatsSnapshotDto["totals"],
  budgetVsActual: BudgetVsActualItem[],
): StatsTotalsBreakdownDto {
  const rawConsumption = budgetVsActual.reduce((sum, item) => {
    if (item.categoryKind === "reserve") return sum;
    return sum + item.actual;
  }, 0);

  const rawSavings = budgetVsActual.reduce((sum, item) => {
    if (item.categoryKind !== "reserve") return sum;
    return sum + item.actual;
  }, 0);

  const consumption = round(rawConsumption);
  const savings = round(rawSavings);
  const unallocated = round(totals.totalIncome - consumption - savings);
  const potentialSavings = round(savings + Math.max(unallocated, 0));

  return {
    consumption,
    savings,
    unallocated,
    potentialSavings,
    rates: {
      savings: round(resolveRate(savings, totals.totalIncome)),
      unallocated: round(resolveRate(unallocated, totals.totalIncome)),
      potentialSavings: round(resolveRate(potentialSavings, totals.totalIncome)),
    },
  };
}

export function buildForecast(trend: TrendItem[], windowMonths: 3 | 6 = 3) {
  const sample = trend.slice(-windowMonths);
  const sampleSize = sample.length;
  const confidence: "low" | "medium" | "high" =
    sampleSize < 3 ? "low" : sampleSize < windowMonths ? "medium" : "high";

  if (sample.length === 0) {
    return {
      projectedIncome: 0,
      projectedExpense: 0,
      projectedBalance: 0,
      windowMonths,
      sampleSize,
      confidence,
    };
  }

  const projectedIncome = Math.round(sample.reduce((sum, item) => sum + item.income, 0) / sample.length);
  const projectedExpense = Math.round(sample.reduce((sum, item) => sum + item.expense, 0) / sample.length);

  return {
    projectedIncome,
    projectedExpense,
    projectedBalance: projectedIncome - projectedExpense,
    windowMonths,
    sampleSize,
    confidence,
  };
}

async function buildStats(
  accountId: string,
  periodType: "semester" | "year",
  periodKey: string,
  months: string[],
  forecastWindow: 3 | 6,
): Promise<StatsSnapshotDto> {
  const transactions = await TransactionModel.find({
    accountId,
    month: { $in: months },
  }).lean();

  const budgets = await BudgetModel.find({
    accountId,
    month: { $in: months },
  }).lean();

  const incomeByMonth = new Map<string, number>();
  const expenseByMonth = new Map<string, number>();
  const actualByCategoryMonth = new Map<string, number>();
  const budgetByCategoryMonth = new Map<string, number>();
  const expenseCategoryNames = new Map<string, string>();
  const expenseCategoryKinds = new Map<string, "expense" | "reserve">();
  const expenseCategoryIds = new Set<string>();
  const incomeByCategoryMonth = new Map<string, number>();
  const incomeCategoryIds = new Set<string>();

  for (const tx of transactions) {
    if (tx.type === "income") {
      incomeByMonth.set(tx.month, (incomeByMonth.get(tx.month) ?? 0) + tx.amount);
      const incomeKey = categoryMonthKey(tx.categoryId, tx.month);
      incomeByCategoryMonth.set(incomeKey, (incomeByCategoryMonth.get(incomeKey) ?? 0) + tx.amount);
      incomeCategoryIds.add(tx.categoryId);
      continue;
    }

    expenseByMonth.set(tx.month, (expenseByMonth.get(tx.month) ?? 0) + tx.amount);
    const key = categoryMonthKey(tx.categoryId, tx.month);
    actualByCategoryMonth.set(key, (actualByCategoryMonth.get(key) ?? 0) + tx.amount);
    expenseCategoryIds.add(tx.categoryId);
  }

  for (const budget of budgets) {
    const monthIncome = incomeByMonth.get(budget.month) ?? 0;
    for (const category of budget.categories) {
      const budgetedAmount = (category.percent / 100) * monthIncome;
      const key = categoryMonthKey(category.id, budget.month);

      expenseCategoryNames.set(category.id, category.name);
      expenseCategoryKinds.set(category.id, category.kind === "reserve" ? "reserve" : "expense");
      budgetByCategoryMonth.set(key, (budgetByCategoryMonth.get(key) ?? 0) + budgetedAmount);
      expenseCategoryIds.add(category.id);
    }
  }

  const incomeCategoryObjectIds = Array.from(incomeCategoryIds)
    .filter((categoryId) => Types.ObjectId.isValid(categoryId))
    .map((categoryId) => new Types.ObjectId(categoryId));

  const incomeCategories = await IncomeCategoryModel.find({
    accountId,
    _id: { $in: incomeCategoryObjectIds },
  })
    .select({ _id: 1, name: 1 })
    .lean();

  const incomeCategoryNames = new Map(
    incomeCategories.map((category) => [category._id.toString(), category.name]),
  );

  const trend: TrendItem[] = months.map((month) => {
    const income = round(incomeByMonth.get(month) ?? 0);
    const expense = round(expenseByMonth.get(month) ?? 0);
    return {
      month,
      income,
      expense,
      balance: round(income - expense),
    };
  });

  const totalIncome = trend.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = trend.reduce((sum, item) => sum + item.expense, 0);

  const budgetVsActual: BudgetVsActualItem[] = Array.from(expenseCategoryIds).map((categoryId) => {
    const budgeted = round(
      months.reduce(
        (sum, month) => sum + (budgetByCategoryMonth.get(categoryMonthKey(categoryId, month)) ?? 0),
        0,
      ),
    );
    const actual = round(
      months.reduce(
        (sum, month) => sum + (actualByCategoryMonth.get(categoryMonthKey(categoryId, month)) ?? 0),
        0,
      ),
    );

    return {
      categoryId,
      categoryName: expenseCategoryNames.get(categoryId) ?? categoryId,
      categoryKind: expenseCategoryKinds.get(categoryId) ?? "expense",
      budgeted,
      actual,
      difference: round(budgeted - actual),
    };
  });

  budgetVsActual.sort((a, b) => b.actual - a.actual);

  const categorySeries: CategorySeriesItem[] = budgetVsActual.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryKind: item.categoryKind,
    monthly: months.map((month) => ({
      month,
      budgeted: round(budgetByCategoryMonth.get(categoryMonthKey(item.categoryId, month)) ?? 0),
      actual: round(actualByCategoryMonth.get(categoryMonthKey(item.categoryId, month)) ?? 0),
    })),
  }));

  const incomeByCategory: IncomeByCategoryItem[] = Array.from(incomeCategoryIds).map((categoryId) => {
    const amount = round(
      months.reduce(
        (sum, month) => sum + (incomeByCategoryMonth.get(categoryMonthKey(categoryId, month)) ?? 0),
        0,
      ),
    );

    return {
      categoryId,
      categoryName: incomeCategoryNames.get(categoryId) ?? categoryId,
      amount,
      percent: totalIncome > 0 ? round((amount / totalIncome) * 100) : 0,
    };
  });

  incomeByCategory.sort((a, b) => b.amount - a.amount);

  const incomeCategorySeries: IncomeCategorySeriesItem[] = incomeByCategory.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    monthly: months.map((month) => ({
      month,
      amount: round(incomeByCategoryMonth.get(categoryMonthKey(item.categoryId, month)) ?? 0),
    })),
  }));

  const totals = {
    totalIncome: round(totalIncome),
    totalExpense: round(totalExpense),
    balance: round(totalIncome - totalExpense),
  };
  const totalsBreakdown = buildTotalsBreakdown(totals, budgetVsActual);

  return {
    periodType,
    periodKey,
    totals,
    totalsBreakdown,
    trend,
    budgetVsActual,
    categorySeries,
    incomeByCategory,
    incomeCategorySeries,
    forecast: buildForecast(trend, forecastWindow),
  };
}

export async function getSemesterStats(
  accountId: string,
  endingMonth?: string,
  forecastWindow: 3 | 6 = 3,
  includeInsight = true,
): Promise<StatsSnapshotDto> {
  const anchor = endingMonth ?? monthFromDate(new Date());
  const months = lastNMonthsEndingAt(anchor, 6);
  const periodKey = semesterKey(anchor);
  const snapshot = await buildStats(accountId, "semester", periodKey, months, forecastWindow);

  if (!includeInsight) {
    return snapshot;
  }

  const insight = await generateStatsInsight({
    accountId,
    forecastWindow,
    snapshot,
  });
  return insight ? { ...snapshot, insight } : snapshot;
}

export async function getYearStats(
  accountId: string,
  year?: number,
  forecastWindow: 3 | 6 = 3,
  includeInsight = true,
): Promise<StatsSnapshotDto> {
  const snapshot = await (async () => {
    if (year) {
      return buildStats(accountId, "year", String(year), monthsForYear(year), forecastWindow);
    }
    const anchor = monthFromDate(new Date());
    return buildStats(accountId, "year", anchor.slice(0, 4), lastNMonthsEndingAt(anchor, 12), forecastWindow);
  })();

  if (!includeInsight) {
    return snapshot;
  }

  const insight = await generateStatsInsight({
    accountId,
    forecastWindow,
    snapshot,
  });
  return insight ? { ...snapshot, insight } : snapshot;
}

export async function compareBudget(accountId: string, from: string, to: string): Promise<BudgetCompareDto> {
  const fromYear = Number(from.slice(0, 4));
  const fromMonth = Number(from.slice(5, 7));
  const toYear = Number(to.slice(0, 4));
  const toMonth = Number(to.slice(5, 7));

  const fromDate = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
  const toDate = new Date(Date.UTC(toYear, toMonth - 1, 1));
  const months: string[] = [];

  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    months.push(monthFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    if (months.length > 36) break;
  }

  const stats = await buildStats(accountId, "semester", `${from}_${to}`, months, 3);
  const budgeted = stats.budgetVsActual.reduce((sum, item) => sum + item.budgeted, 0);
  const actual = stats.budgetVsActual.reduce((sum, item) => sum + item.actual, 0);

  return {
    from,
    to,
    totals: {
      budgeted: round(budgeted),
      actual: round(actual),
      difference: round(budgeted - actual),
    },
    items: stats.budgetVsActual,
  };
}

export async function materializeCurrentSnapshots(accountId: string): Promise<void> {
  const nowMonth = monthFromDate(new Date());
  const semesterStats = await getSemesterStats(accountId, nowMonth, 3, false);
  const yearStats = await getYearStats(accountId, undefined, 3, false);

  await StatsSnapshotModel.findOneAndUpdate(
    {
      accountId,
      periodType: "semester",
      periodKey: semesterStats.periodKey,
    },
    {
      $set: {
        payload: semesterStats,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  await StatsSnapshotModel.findOneAndUpdate(
    {
      accountId,
      periodType: "year",
      periodKey: yearStats.periodKey,
    },
    {
      $set: {
        payload: yearStats,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
}
