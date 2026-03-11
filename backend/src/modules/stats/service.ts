import { BudgetModel } from "../../models/budget.model.js";
import { StatsSnapshotModel } from "../../models/stats-snapshot.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { lastNMonthsEndingAt, monthFromDate } from "../../lib/month.js";

interface TrendItem {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface BudgetVsActualItem {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  actual: number;
  difference: number;
}

interface StatsSnapshotDto {
  periodType: "semester" | "year";
  periodKey: string;
  totals: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
  trend: TrendItem[];
  budgetVsActual: BudgetVsActualItem[];
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
  };
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

export function buildForecast(trend: TrendItem[]) {
  const sample = trend.slice(-3);
  if (sample.length === 0) {
    return {
      projectedIncome: 0,
      projectedExpense: 0,
      projectedBalance: 0,
    };
  }

  const projectedIncome = Math.round(sample.reduce((sum, item) => sum + item.income, 0) / sample.length);
  const projectedExpense = Math.round(sample.reduce((sum, item) => sum + item.expense, 0) / sample.length);

  return {
    projectedIncome,
    projectedExpense,
    projectedBalance: projectedIncome - projectedExpense,
  };
}

async function buildStats(
  accountId: string,
  periodType: "semester" | "year",
  periodKey: string,
  months: string[],
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
  const actualByCategory = new Map<string, number>();
  const budgetByCategory = new Map<string, number>();
  const categoryNames = new Map<string, string>();

  for (const tx of transactions) {
    if (tx.type === "income") {
      incomeByMonth.set(tx.month, (incomeByMonth.get(tx.month) ?? 0) + tx.amount);
      continue;
    }

    expenseByMonth.set(tx.month, (expenseByMonth.get(tx.month) ?? 0) + tx.amount);
    actualByCategory.set(tx.categoryId, (actualByCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  for (const budget of budgets) {
    const monthIncome = incomeByMonth.get(budget.month) ?? 0;
    for (const category of budget.categories) {
      categoryNames.set(category.id, category.name);
      const budgetedAmount = (category.percent / 100) * monthIncome;
      budgetByCategory.set(category.id, (budgetByCategory.get(category.id) ?? 0) + budgetedAmount);
    }
  }

  const trend: TrendItem[] = months.map((month) => {
    const income = Math.round((incomeByMonth.get(month) ?? 0) * 100) / 100;
    const expense = Math.round((expenseByMonth.get(month) ?? 0) * 100) / 100;
    return {
      month,
      income,
      expense,
      balance: income - expense,
    };
  });

  const totalIncome = trend.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = trend.reduce((sum, item) => sum + item.expense, 0);

  const categoryIds = new Set<string>([...actualByCategory.keys(), ...budgetByCategory.keys()]);

  const budgetVsActual: BudgetVsActualItem[] = Array.from(categoryIds).map((categoryId) => {
    const budgeted = Math.round((budgetByCategory.get(categoryId) ?? 0) * 100) / 100;
    const actual = Math.round((actualByCategory.get(categoryId) ?? 0) * 100) / 100;
    return {
      categoryId,
      categoryName: categoryNames.get(categoryId) ?? categoryId,
      budgeted,
      actual,
      difference: Math.round((budgeted - actual) * 100) / 100,
    };
  });

  budgetVsActual.sort((a, b) => b.actual - a.actual);

  return {
    periodType,
    periodKey,
    totals: {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      balance: Math.round((totalIncome - totalExpense) * 100) / 100,
    },
    trend,
    budgetVsActual,
    forecast: buildForecast(trend),
  };
}

export async function getSemesterStats(accountId: string, endingMonth?: string): Promise<StatsSnapshotDto> {
  const anchor = endingMonth ?? monthFromDate(new Date());
  const months = lastNMonthsEndingAt(anchor, 6);
  const periodKey = semesterKey(anchor);
  return buildStats(accountId, "semester", periodKey, months);
}

export async function getYearStats(accountId: string, year?: number): Promise<StatsSnapshotDto> {
  if (year) {
    return buildStats(accountId, "year", String(year), monthsForYear(year));
  }

  const anchor = monthFromDate(new Date());
  const months = lastNMonthsEndingAt(anchor, 12);
  const periodKey = anchor.slice(0, 4);
  return buildStats(accountId, "year", periodKey, months);
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

  const stats = await buildStats(accountId, "semester", `${from}_${to}`, months);
  const budgeted = stats.budgetVsActual.reduce((sum, item) => sum + item.budgeted, 0);
  const actual = stats.budgetVsActual.reduce((sum, item) => sum + item.actual, 0);

  return {
    from,
    to,
    totals: {
      budgeted: Math.round(budgeted * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      difference: Math.round((budgeted - actual) * 100) / 100,
    },
    items: stats.budgetVsActual,
  };
}

export async function materializeCurrentSnapshots(accountId: string): Promise<void> {
  const nowMonth = monthFromDate(new Date());
  const semesterStats = await getSemesterStats(accountId, nowMonth);
  const yearStats = await getYearStats(accountId);

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
