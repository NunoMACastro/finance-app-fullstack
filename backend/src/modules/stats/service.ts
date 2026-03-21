import { Types } from "mongoose";
import { unprocessable } from "../../lib/api-error.js";
import { lastNMonthsEndingAt, monthFromDate } from "../../lib/month.js";
import { BudgetModel } from "../../models/budget.model.js";
import { IncomeCategoryModel } from "../../models/income-category.model.js";
import { StatsInsightModel } from "../../models/stats-insight.model.js";
import { StatsSnapshotModel } from "../../models/stats-snapshot.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  anonymizeStatsForInsight,
  buildInsightCategoryMappings,
  buildInsightInputHash,
  remapInsightOutput,
  requestStructuredStatsInsight,
  type AnonymizedStatsInsightPayload,
  type StatsInsightReport,
  type StatsInsightStatusDto,
} from "./insight.service.js";

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

export interface StatsInsightRequestInput {
  periodType: "semester" | "year";
  forecastWindow?: 3 | 6;
  endingMonth?: string;
  year?: number;
}

type StatsInsightStatus = "pending" | "ready" | "failed";

interface StatsInsightLookupContext {
  snapshot: StatsSnapshotDto;
  payload: AnonymizedStatsInsightPayload;
  inputHash: string;
  forecastWindow: 3 | 6;
}

const insightJobs = new Map<string, Promise<void>>();

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

function periodsMonthsLimit(periodType: "semester" | "year"): number {
  return periodType === "semester" ? 6 : 12;
}

function toInsightStatusDto(doc: {
  _id: Types.ObjectId;
  periodType: "semester" | "year";
  periodKey: string;
  forecastWindow: number;
  status: StatsInsightStatus;
  stale: boolean;
  createdAt: Date;
  generatedAt?: Date | null;
  model?: string | null;
  summary?: string | null;
  highlights?: Array<{ title: string; detail: string; severity: "info" | "warning" | "positive" }>;
  risks?: Array<{ title: string; detail: string; severity: "warning" | "high" }>;
  actions?: Array<{ title: string; detail: string; priority: "high" | "medium" | "low" }>;
  categoryInsights?: Array<{
    categoryId: string;
    categoryAlias: string;
    categoryKind: "expense" | "reserve";
    categoryName: string;
    title: string;
    detail: string;
    action?: string | null;
  }>;
  confidence?: StatsInsightReport["confidence"] | null;
  limitations?: string[];
  errorCode?: string | null;
  errorMessage?: string | null;
}): StatsInsightStatusDto {
  const hasReport = doc.status === "ready" && doc.summary && doc.confidence;
  const categoryInsights = (doc.categoryInsights ?? []).map((item) => ({
    categoryId: item.categoryId,
    categoryAlias: item.categoryAlias,
    categoryKind: item.categoryKind,
    categoryName: item.categoryName,
    title: item.title,
    detail: item.detail,
    ...(item.action ? { action: item.action } : {}),
  }));

  return {
    id: doc._id.toString(),
    periodType: doc.periodType,
    periodKey: doc.periodKey,
    forecastWindow: doc.forecastWindow === 6 ? 6 : 3,
    status: doc.status,
    stale: doc.stale,
    requestedAt: doc.createdAt.toISOString(),
    generatedAt: doc.generatedAt ? doc.generatedAt.toISOString() : null,
    model: doc.model ?? null,
    report: hasReport
      ? {
          summary: doc.summary!,
          highlights: doc.highlights ?? [],
          risks: doc.risks ?? [],
          actions: doc.actions ?? [],
          categoryInsights,
          confidence: doc.confidence!,
          ...(doc.limitations && doc.limitations.length > 0 ? { limitations: doc.limitations } : {}),
        }
      : null,
    error:
      doc.status === "failed"
        ? {
            code: doc.errorCode ?? "STATS_INSIGHT_FAILED",
            message: doc.errorMessage ?? "Não foi possível gerar o insight IA.",
          }
        : null,
  };
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

async function resolveStatsSnapshot(
  accountId: string,
  request: StatsInsightRequestInput,
): Promise<{ snapshot: StatsSnapshotDto; forecastWindow: 3 | 6 }> {
  const forecastWindow = request.forecastWindow ?? 3;

  if (request.periodType === "semester") {
    const anchor = request.endingMonth ?? monthFromDate(new Date());
    const months = lastNMonthsEndingAt(anchor, 6);
    const periodKey = semesterKey(anchor);
    const snapshot = await buildStats(accountId, "semester", periodKey, months, forecastWindow);
    return { snapshot, forecastWindow };
  }

  const snapshot = await (async () => {
    if (request.year) {
      return buildStats(accountId, "year", String(request.year), monthsForYear(request.year), forecastWindow);
    }
    const anchor = monthFromDate(new Date());
    return buildStats(accountId, "year", anchor.slice(0, 4), lastNMonthsEndingAt(anchor, 12), forecastWindow);
  })();

  return { snapshot, forecastWindow };
}

async function buildInsightLookupContext(
  accountId: string,
  request: StatsInsightRequestInput,
): Promise<StatsInsightLookupContext> {
  const { snapshot, forecastWindow } = await resolveStatsSnapshot(accountId, request);
  const payload = anonymizeStatsForInsight(snapshot, periodsMonthsLimit(snapshot.periodType));
  const inputHash = buildInsightInputHash(payload);
  return {
    snapshot,
    payload,
    inputHash,
    forecastWindow,
  };
}

function scheduleInsightJob(insightId: string): void {
  if (insightJobs.has(insightId)) {
    return;
  }

  const job = (async () => {
    const insight = await StatsInsightModel.findById(insightId);
    if (!insight || insight.status !== "pending") {
      return;
    }

    const rawPayload = insight.rawPayload as AnonymizedStatsInsightPayload | null;
    const categoryMappings = insight.categoryMappings as Array<{
      alias: string;
      categoryId: string;
      categoryName: string;
      categoryKind: "expense" | "reserve" | "income";
    }>;

    if (!rawPayload || !Array.isArray(categoryMappings)) {
      await StatsInsightModel.updateOne(
        { _id: insight._id, status: "pending" },
        {
          $set: {
            status: "failed",
            errorCode: "STATS_INSIGHT_INPUT_INVALID",
            errorMessage: "Não foi possível preparar o insight IA.",
          },
        },
      );
      return;
    }

    const output = await requestStructuredStatsInsight(rawPayload);
    if (!output) {
      await StatsInsightModel.updateOne(
        { _id: insight._id, status: "pending" },
        {
          $set: {
            status: "failed",
            errorCode: "STATS_INSIGHT_PROVIDER_UNAVAILABLE",
            errorMessage: "Não foi possível gerar o insight IA.",
          },
        },
      );
      return;
    }

    const report = remapInsightOutput(output, categoryMappings);

    await StatsInsightModel.updateOne(
      { _id: insight._id, status: "pending" },
      {
        $set: {
          status: "ready",
          model: insight.model,
          summary: report.summary,
          highlights: report.highlights,
          risks: report.risks,
          actions: report.actions,
          categoryInsights: report.categoryInsights,
          confidence: report.confidence,
          limitations: report.limitations ?? [],
          errorCode: null,
          errorMessage: null,
          generatedAt: new Date(),
        },
      },
    );
  })()
    .catch((error) => {
      logger.error({ err: error, insightId }, "Stats insight background job failed");
    })
    .finally(() => {
      insightJobs.delete(insightId);
    });

  insightJobs.set(insightId, job);
}

export async function getSemesterStats(
  accountId: string,
  endingMonth?: string,
  forecastWindow: 3 | 6 = 3,
  includeInsight = false,
): Promise<StatsSnapshotDto> {
  void includeInsight;
  const { snapshot } = await resolveStatsSnapshot(accountId, {
    periodType: "semester",
    endingMonth,
    forecastWindow,
  });
  return snapshot;
}

export async function getYearStats(
  accountId: string,
  year?: number,
  forecastWindow: 3 | 6 = 3,
  includeInsight = false,
): Promise<StatsSnapshotDto> {
  void includeInsight;
  const { snapshot } = await resolveStatsSnapshot(accountId, {
    periodType: "year",
    year,
    forecastWindow,
  });
  return snapshot;
}

export async function requestStatsInsight(
  accountId: string,
  userId: string,
  request: StatsInsightRequestInput,
): Promise<StatsInsightStatusDto> {
  const { snapshot, payload, inputHash, forecastWindow } = await buildInsightLookupContext(accountId, request);

  const filter = {
    accountId,
    periodType: snapshot.periodType,
    periodKey: snapshot.periodKey,
    forecastWindow,
    inputHash,
    stale: false,
  };

  const readyExisting = await StatsInsightModel.findOne({
    ...filter,
    status: "ready",
  }).sort({ generatedAt: -1, createdAt: -1 });
  if (readyExisting) {
    return toInsightStatusDto(readyExisting);
  }

  const pendingExisting = await StatsInsightModel.findOne({
    ...filter,
    status: "pending",
  }).sort({ createdAt: -1 });
  if (pendingExisting) {
    scheduleInsightJob(pendingExisting._id.toString());
    return toInsightStatusDto(pendingExisting);
  }

  const insight = await StatsInsightModel.create({
    accountId,
    requestedByUserId: userId,
    periodType: snapshot.periodType,
    periodKey: snapshot.periodKey,
    forecastWindow,
    inputHash,
    status: "pending",
    stale: false,
    model: env.OPENAI_API_KEY ? env.OPENAI_INSIGHT_MODEL : null,
    rawPayload: payload,
    categoryMappings: buildInsightCategoryMappings(snapshot),
    summary: null,
    confidence: null,
    generatedAt: null,
    limitations: [],
    highlights: [],
    risks: [],
    actions: [],
    categoryInsights: [],
    errorCode: null,
    errorMessage: null,
  });

  scheduleInsightJob(insight._id.toString());
  return toInsightStatusDto(insight);
}

export async function getStatsInsightById(
  accountId: string,
  insightId: string,
): Promise<StatsInsightStatusDto | null> {
  if (!Types.ObjectId.isValid(insightId)) {
    return null;
  }

  const insight = await StatsInsightModel.findOne({ _id: insightId, accountId });
  if (!insight) {
    return null;
  }

  if (insight.status === "pending") {
    scheduleInsightJob(insight._id.toString());
  }

  return toInsightStatusDto(insight);
}

export async function getLatestStatsInsight(
  accountId: string,
  request: StatsInsightRequestInput,
): Promise<StatsInsightStatusDto | null> {
  const { snapshot, inputHash, forecastWindow } = await buildInsightLookupContext(accountId, request);

  const exactCurrent = await StatsInsightModel.findOne({
    accountId,
    periodType: snapshot.periodType,
    periodKey: snapshot.periodKey,
    forecastWindow,
    inputHash,
  }).sort({ createdAt: -1 });

  if (exactCurrent) {
    if (exactCurrent.status === "pending") {
      scheduleInsightJob(exactCurrent._id.toString());
    }
    return toInsightStatusDto(exactCurrent);
  }

  const latest = await StatsInsightModel.findOne({
    accountId,
    periodType: snapshot.periodType,
    periodKey: snapshot.periodKey,
    forecastWindow,
  }).sort({ createdAt: -1 });

  if (!latest) {
    return null;
  }

  if (latest.status === "pending") {
    scheduleInsightJob(latest._id.toString());
  }

  return toInsightStatusDto(latest);
}

export async function markStatsInsightsStaleForAccount(accountId: string): Promise<void> {
  await StatsInsightModel.updateMany(
    {
      accountId,
      stale: false,
    },
    {
      $set: {
        stale: true,
      },
    },
  );
}

export async function compareBudget(accountId: string, from: string, to: string): Promise<BudgetCompareDto> {
  const fromYear = Number(from.slice(0, 4));
  const fromMonth = Number(from.slice(5, 7));
  const toYear = Number(to.slice(0, 4));
  const toMonth = Number(to.slice(5, 7));

  const fromDate = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
  const toDate = new Date(Date.UTC(toYear, toMonth - 1, 1));
  const months: string[] = [];

  if (fromDate > toDate) {
    unprocessable("Intervalo inválido: 'from' tem de ser anterior ou igual a 'to'", "STATS_COMPARE_RANGE_INVALID");
  }

  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    months.push(monthFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    if (months.length > 24) {
      unprocessable("Intervalo demasiado longo para comparação", "STATS_COMPARE_RANGE_TOO_LARGE", {
        maxMonths: "24",
      });
    }
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
