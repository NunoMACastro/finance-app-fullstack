import { Types } from "mongoose";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { monthFromDate, monthToDate } from "../../lib/month.js";
import { BudgetModel } from "../../models/budget.model.js";
import { RecurringRuleModel } from "../../models/recurring-rule.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import {
  ensureRecurringExpenseFallbackCategory,
  isProtectedBudgetCategoryId,
  syncBudgetTotalFromTransactions,
} from "../budgets/service.js";
import {
  assertIncomeCategoryActive,
  ensureDefaultIncomeCategoryForAccount,
} from "../income-categories/service.js";
import { markStatsInsightsStaleForAccount } from "../stats/service.js";

type GenerationStatus = "ok" | "fallback";

type CategoryResolution = "direct" | "fallback";

interface RecurringRuleDto {
  id: string;
  accountId: string;
  userId: string;
  type: "income" | "expense";
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: string;
  endMonth?: string;
  active: boolean;
  lastGenerationAt?: string;
  lastGenerationStatus?: GenerationStatus;
  pendingFallbackCount: number;
}

interface GenerateRecurringResult {
  created: number;
  fallbackCreated: number;
  processedRules: number;
}

interface ReassignRecurringCategoryResult {
  rule: RecurringRuleDto;
  migratedTransactions: number;
}

interface ResolvedRecurringCategory {
  categoryId: string;
  resolution: CategoryResolution;
  requestedCategoryId?: string;
}

function toDto(
  doc: {
    _id: Types.ObjectId;
    accountId: Types.ObjectId;
    userId: Types.ObjectId;
    type: "income" | "expense";
    name: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string;
    startMonth: string;
    endMonth?: string | null;
    active: boolean;
    lastGenerationAt?: Date | null;
    lastGenerationStatus?: GenerationStatus | null;
  },
  pendingFallbackCount: number,
): RecurringRuleDto {
  return {
    id: doc._id.toString(),
    accountId: doc.accountId.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    name: doc.name,
    amount: doc.amount,
    dayOfMonth: doc.dayOfMonth,
    categoryId: doc.categoryId,
    startMonth: doc.startMonth,
    ...(doc.endMonth ? { endMonth: doc.endMonth } : {}),
    active: doc.active,
    ...(doc.lastGenerationAt ? { lastGenerationAt: doc.lastGenerationAt.toISOString() } : {}),
    ...(doc.lastGenerationStatus ? { lastGenerationStatus: doc.lastGenerationStatus } : {}),
    pendingFallbackCount,
  };
}

function isRuleActiveForMonth(
  rule: { active: boolean; startMonth: string; endMonth?: string | null },
  month: string,
): boolean {
  if (!rule.active) return false;
  if (rule.startMonth > month) return false;
  if (rule.endMonth && rule.endMonth < month) return false;
  return true;
}

export function shouldGenerateRuleForMonth(
  rule: { dayOfMonth: number; active: boolean; startMonth: string; endMonth?: string | null },
  month: string,
  asOfDate: Date,
): boolean {
  if (!isRuleActiveForMonth(rule, month)) return false;

  const currentMonth = monthFromDate(asOfDate);
  if (month > currentMonth) {
    return false;
  }

  if (month < currentMonth) {
    return true;
  }

  const dueDay = monthToDate(month, rule.dayOfMonth).getUTCDate();
  return dueDay <= asOfDate.getUTCDate();
}

function ensureExpenseCategoryProvided(categoryId?: string): string {
  const cleanId = categoryId?.trim();
  if (!cleanId) {
    unprocessable("Categoria obrigatoria", "RECURRING_CATEGORY_REQUIRED");
  }
  return cleanId;
}

async function ensureRecurringCategoryForType(
  accountId: string,
  type: "income" | "expense",
  categoryId?: string,
): Promise<string> {
  if (type === "income") {
    await assertIncomeCategoryActive(accountId, categoryId);
    return categoryId!.trim();
  }

  const cleanId = ensureExpenseCategoryProvided(categoryId);
  if (isProtectedBudgetCategoryId(cleanId)) {
    unprocessable("Categoria técnica de fallback não pode ser usada diretamente", "RECURRING_CATEGORY_PROTECTED");
  }
  return cleanId;
}

async function getPendingFallbackCount(accountId: string, ruleId: Types.ObjectId): Promise<number> {
  return TransactionModel.countDocuments({
    accountId,
    recurringRuleId: ruleId,
    origin: "recurring",
    categoryResolution: "fallback",
  });
}

async function resolveIncomeRecurringCategory(
  accountId: string,
  requestedCategoryId: string,
): Promise<ResolvedRecurringCategory> {
  try {
    await assertIncomeCategoryActive(accountId, requestedCategoryId);
    return {
      categoryId: requestedCategoryId,
      resolution: "direct",
    };
  } catch {
    const defaultCategory = await ensureDefaultIncomeCategoryForAccount(accountId);
    return {
      categoryId: defaultCategory.id,
      resolution: "fallback",
      requestedCategoryId,
    };
  }
}

async function resolveExpenseRecurringCategory(
  accountId: string,
  month: string,
  requestedCategoryId: string,
  actorUserId: string,
): Promise<ResolvedRecurringCategory> {
  const budgetWithCategory = await BudgetModel.findOne({
    accountId,
    month,
    "categories.id": requestedCategoryId,
  })
    .select({ _id: 1 })
    .lean();

  if (budgetWithCategory) {
    return {
      categoryId: requestedCategoryId,
      resolution: "direct",
    };
  }

  const fallbackCategoryId = await ensureRecurringExpenseFallbackCategory(accountId, month, actorUserId);
  return {
    categoryId: fallbackCategoryId,
    resolution: "fallback",
    requestedCategoryId,
  };
}

async function resolveRecurringCategory(
  accountId: string,
  month: string,
  rule: {
    type: "income" | "expense";
    categoryId: string;
    userId: Types.ObjectId;
  },
): Promise<ResolvedRecurringCategory> {
  if (rule.type === "income") {
    return resolveIncomeRecurringCategory(accountId, rule.categoryId);
  }

  return resolveExpenseRecurringCategory(accountId, month, rule.categoryId, rule.userId.toString());
}

export async function listRules(accountId: string): Promise<RecurringRuleDto[]> {
  const rules = await RecurringRuleModel.find({ accountId }).sort({ createdAt: -1 });
  if (rules.length === 0) {
    return [];
  }

  const accountObjectId = new Types.ObjectId(accountId);
  const ruleIds = rules.map((rule) => rule._id);
  const fallbackCounts = await TransactionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        accountId: accountObjectId,
        origin: "recurring",
        recurringRuleId: { $in: ruleIds },
        categoryResolution: "fallback",
      },
    },
    {
      $group: {
        _id: "$recurringRuleId",
        count: { $sum: 1 },
      },
    },
  ]);
  const fallbackCountByRuleId = new Map<string, number>(
    fallbackCounts.map((entry) => [entry._id.toString(), entry.count]),
  );

  return rules.map((rule) => toDto(rule, fallbackCountByRuleId.get(rule._id.toString()) ?? 0));
}

export async function createRule(
  accountId: string,
  actorUserId: string,
  input: {
    type: "income" | "expense";
    name: string;
    amount: number;
    dayOfMonth: number;
    categoryId?: string;
    startMonth: string;
    endMonth?: string;
  },
): Promise<RecurringRuleDto> {
  const categoryId = await ensureRecurringCategoryForType(accountId, input.type, input.categoryId);

  const rule = await RecurringRuleModel.create({
    accountId,
    userId: actorUserId,
    type: input.type,
    name: input.name,
    amount: input.amount,
    dayOfMonth: input.dayOfMonth,
    categoryId,
    startMonth: input.startMonth,
    endMonth: input.endMonth ?? null,
    active: true,
    lastGenerationAt: null,
    lastGenerationStatus: null,
  });

  await markStatsInsightsStaleForAccount(accountId);
  return toDto(rule, 0);
}

export async function updateRule(
  accountId: string,
  actorUserId: string,
  ruleId: string,
  input: {
    name?: string;
    amount?: number;
    dayOfMonth?: number;
    categoryId?: string;
    endMonth?: string;
    active?: boolean;
  },
): Promise<RecurringRuleDto> {
  const rule = await RecurringRuleModel.findOne({ _id: ruleId, accountId });
  if (!rule) {
    notFound("Regra recorrente não encontrada", "RECURRING_RULE_NOT_FOUND");
  }

  if (input.endMonth && input.endMonth < rule.startMonth) {
    unprocessable("endMonth deve ser >= startMonth", "RECURRING_END_MONTH_INVALID");
  }

  const nextCategoryId = input.categoryId ?? rule.categoryId;
  const ensuredCategoryId = await ensureRecurringCategoryForType(accountId, rule.type, nextCategoryId);

  if (input.name !== undefined) rule.name = input.name;
  if (input.amount !== undefined) rule.amount = input.amount;
  if (input.dayOfMonth !== undefined) rule.dayOfMonth = input.dayOfMonth;
  if (input.categoryId !== undefined || rule.type === "income") rule.categoryId = ensuredCategoryId;
  if (input.endMonth !== undefined) rule.endMonth = input.endMonth;
  if (input.active !== undefined) rule.active = input.active;
  rule.userId = new Types.ObjectId(actorUserId);

  await rule.save();
  const pendingFallbackCount = await getPendingFallbackCount(accountId, rule._id);
  await markStatsInsightsStaleForAccount(accountId);
  return toDto(rule, pendingFallbackCount);
}

export async function deleteRule(accountId: string, ruleId: string): Promise<void> {
  const result = await RecurringRuleModel.deleteOne({ _id: ruleId, accountId });
  if (result.deletedCount === 0) {
    notFound("Regra recorrente não encontrada", "RECURRING_RULE_NOT_FOUND");
  }
  await markStatsInsightsStaleForAccount(accountId);
}

export async function reassignRuleCategory(
  accountId: string,
  actorUserId: string,
  ruleId: string,
  input: {
    categoryId: string;
    migratePastFallbackTransactions: boolean;
  },
): Promise<ReassignRecurringCategoryResult> {
  const rule = await RecurringRuleModel.findOne({ _id: ruleId, accountId });
  if (!rule) {
    notFound("Regra recorrente não encontrada", "RECURRING_RULE_NOT_FOUND");
  }

  const categoryId = await ensureRecurringCategoryForType(accountId, rule.type, input.categoryId);

  let incomeMonthsToSync: string[] = [];
  if (input.migratePastFallbackTransactions && rule.type === "income") {
    incomeMonthsToSync = await TransactionModel.distinct("month", {
      accountId,
      recurringRuleId: rule._id,
      origin: "recurring",
      categoryResolution: "fallback",
    });
  }

  let migratedTransactions = 0;
  if (input.migratePastFallbackTransactions) {
    const migrationResult = await TransactionModel.updateMany(
      {
        accountId,
        recurringRuleId: rule._id,
        origin: "recurring",
        categoryResolution: "fallback",
      },
      {
        $set: {
          categoryId,
          categoryResolution: "direct",
        },
        $unset: {
          requestedCategoryId: "",
        },
      },
    );

    migratedTransactions = migrationResult.modifiedCount;

    if (rule.type === "income") {
      for (const month of incomeMonthsToSync) {
        await syncBudgetTotalFromTransactions(accountId, month);
      }
    }
  }

  rule.categoryId = categoryId;
  rule.userId = new Types.ObjectId(actorUserId);
  await rule.save();
  await markStatsInsightsStaleForAccount(accountId);

  const pendingFallbackCount = await getPendingFallbackCount(accountId, rule._id);
  return {
    rule: toDto(rule, pendingFallbackCount),
    migratedTransactions,
  };
}

export async function generateForAccountMonth(
  accountId: string,
  month: string,
  asOfDate = new Date(),
): Promise<GenerateRecurringResult> {
  const rules = await RecurringRuleModel.find({ accountId, active: true });
  const rulesToGenerate = rules.filter((rule) => shouldGenerateRuleForMonth(rule, month, asOfDate));

  if (rulesToGenerate.length === 0) {
    return { created: 0, fallbackCreated: 0, processedRules: 0 };
  }

  let created = 0;
  let fallbackCreated = 0;

  for (const rule of rulesToGenerate) {
    const date = monthToDate(month, rule.dayOfMonth);
    const resolvedCategory = await resolveRecurringCategory(accountId, month, rule);

    const result = await TransactionModel.updateOne(
      {
        accountId,
        recurringRuleId: rule._id,
        month,
      },
      {
        $setOnInsert: {
          accountId,
          userId: rule.userId,
          month,
          date,
          type: rule.type,
          origin: "recurring",
          recurringRuleId: rule._id,
          description: rule.name,
          amount: rule.amount,
          categoryId: resolvedCategory.categoryId,
          categoryResolution: resolvedCategory.resolution,
          requestedCategoryId:
            resolvedCategory.resolution === "fallback" ? resolvedCategory.requestedCategoryId : null,
        },
      },
      { upsert: true },
    );

    const wasCreated = result.upsertedCount ?? 0;
    created += wasCreated;
    if (wasCreated > 0 && resolvedCategory.resolution === "fallback") {
      fallbackCreated += wasCreated;
    }

    rule.lastGenerationAt = asOfDate;
    rule.lastGenerationStatus = resolvedCategory.resolution === "fallback" ? "fallback" : "ok";
    await rule.save();
  }

  if (created > 0) {
    await syncBudgetTotalFromTransactions(accountId, month);
    await markStatsInsightsStaleForAccount(accountId);
  }

  return {
    created,
    fallbackCreated,
    processedRules: rulesToGenerate.length,
  };
}

export async function generateForAllAccountsMonth(
  month: string,
  asOfDate = new Date(),
): Promise<{ totalCreated: number; totalFallbackCreated: number; totalProcessedRules: number }> {
  const accountIds = await RecurringRuleModel.distinct("accountId", { active: true });
  let totalCreated = 0;
  let totalFallbackCreated = 0;
  let totalProcessedRules = 0;

  for (const accountId of accountIds) {
    const result = await generateForAccountMonth(String(accountId), month, asOfDate);
    totalCreated += result.created;
    totalFallbackCreated += result.fallbackCreated;
    totalProcessedRules += result.processedRules;
  }

  return {
    totalCreated,
    totalFallbackCreated,
    totalProcessedRules,
  };
}
