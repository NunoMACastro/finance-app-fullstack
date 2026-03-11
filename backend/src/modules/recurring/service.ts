import { Types } from "mongoose";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { monthToDate } from "../../lib/month.js";
import { RecurringRuleModel } from "../../models/recurring-rule.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { syncBudgetTotalFromTransactions } from "../budgets/service.js";

interface RecurringRuleDto {
  id: string;
  userId: string;
  type: "income" | "expense";
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: string;
  endMonth?: string;
  active: boolean;
}

function toDto(doc: {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: "income" | "expense";
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: string;
  endMonth?: string | null;
  active: boolean;
}): RecurringRuleDto {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    name: doc.name,
    amount: doc.amount,
    dayOfMonth: doc.dayOfMonth,
    categoryId: doc.categoryId,
    startMonth: doc.startMonth,
    ...(doc.endMonth ? { endMonth: doc.endMonth } : {}),
    active: doc.active,
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

export async function listRules(userId: string): Promise<RecurringRuleDto[]> {
  const rules = await RecurringRuleModel.find({ userId }).sort({ createdAt: -1 });
  return rules.map(toDto);
}

export async function createRule(
  userId: string,
  input: {
    type: "income" | "expense";
    name: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string;
    startMonth: string;
    endMonth?: string;
  },
): Promise<RecurringRuleDto> {
  const rule = await RecurringRuleModel.create({
    userId,
    type: input.type,
    name: input.name,
    amount: input.amount,
    dayOfMonth: input.dayOfMonth,
    categoryId: input.categoryId,
    startMonth: input.startMonth,
    endMonth: input.endMonth ?? null,
    active: true,
  });

  return toDto(rule);
}

export async function updateRule(
  userId: string,
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
  const rule = await RecurringRuleModel.findOne({ _id: ruleId, userId });
  if (!rule) {
    notFound("Regra recorrente nao encontrada", "RECURRING_RULE_NOT_FOUND");
  }

  if (input.endMonth && input.endMonth < rule.startMonth) {
    unprocessable("endMonth deve ser >= startMonth", "RECURRING_END_MONTH_INVALID");
  }

  if (input.name !== undefined) rule.name = input.name;
  if (input.amount !== undefined) rule.amount = input.amount;
  if (input.dayOfMonth !== undefined) rule.dayOfMonth = input.dayOfMonth;
  if (input.categoryId !== undefined) rule.categoryId = input.categoryId;
  if (input.endMonth !== undefined) rule.endMonth = input.endMonth;
  if (input.active !== undefined) rule.active = input.active;

  await rule.save();
  return toDto(rule);
}

export async function deleteRule(userId: string, ruleId: string): Promise<void> {
  const result = await RecurringRuleModel.deleteOne({ _id: ruleId, userId });
  if (result.deletedCount === 0) {
    notFound("Regra recorrente nao encontrada", "RECURRING_RULE_NOT_FOUND");
  }
}

export async function generateForUserMonth(userId: string, month: string): Promise<{ created: number }> {
  const rules = await RecurringRuleModel.find({ userId, active: true });
  const activeRules = rules.filter((rule) => isRuleActiveForMonth(rule, month));

  if (activeRules.length === 0) {
    return { created: 0 };
  }

  let created = 0;

  for (const rule of activeRules) {
    const date = monthToDate(month, rule.dayOfMonth);
    const result = await TransactionModel.updateOne(
      {
        userId,
        recurringRuleId: rule._id,
        month,
      },
      {
        $setOnInsert: {
          userId,
          month,
          date,
          type: rule.type,
          origin: "recurring",
          recurringRuleId: rule._id,
          description: rule.name,
          amount: rule.amount,
          categoryId: rule.categoryId,
        },
      },
      { upsert: true },
    );

    created += result.upsertedCount ?? 0;
  }

  if (created > 0) {
    await syncBudgetTotalFromTransactions(userId, month);
  }

  return { created };
}

export async function generateForAllUsersMonth(month: string): Promise<number> {
  const userIds = await RecurringRuleModel.distinct("userId", { active: true });
  let totalCreated = 0;

  for (const userId of userIds) {
    const result = await generateForUserMonth(String(userId), month);
    totalCreated += result.created;
  }

  return totalCreated;
}
