import { Types } from "mongoose";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { monthFromDate } from "../../lib/month.js";
import { BudgetModel } from "../../models/budget.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import { isBudgetReady, syncBudgetTotalFromTransactions } from "../budgets/service.js";
import { assertIncomeCategoryActive } from "../income-categories/service.js";

interface TransactionDto {
  id: string;
  accountId: string;
  userId: string;
  month: string;
  date: string;
  type: "income" | "expense";
  origin: "manual" | "recurring";
  recurringRuleId?: string;
  description: string;
  amount: number;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthSummaryDto {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeTransactions: TransactionDto[];
  expenseTransactions: TransactionDto[];
}

function toTransactionDto(doc: {
  _id: Types.ObjectId;
  accountId: Types.ObjectId;
  userId: Types.ObjectId;
  month: string;
  date: Date;
  type: "income" | "expense";
  origin: "manual" | "recurring";
  recurringRuleId?: Types.ObjectId | null;
  description: string;
  amount: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}): TransactionDto {
  return {
    id: doc._id.toString(),
    accountId: doc.accountId.toString(),
    userId: doc.userId.toString(),
    month: doc.month,
    date: doc.date.toISOString().slice(0, 10),
    type: doc.type,
    origin: doc.origin,
    ...(doc.recurringRuleId ? { recurringRuleId: doc.recurringRuleId.toString() } : {}),
    description: doc.description,
    amount: doc.amount,
    categoryId: doc.categoryId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function parseAndValidateDate(date: string, expectedMonth?: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    unprocessable("Data invalida", "INVALID_DATE");
  }

  if (expectedMonth && monthFromDate(parsed) !== expectedMonth) {
    unprocessable("A data nao corresponde ao mes indicado", "DATE_MONTH_MISMATCH");
  }

  return parsed;
}

async function ensureManualTransactionsAllowed(accountId: string, month: string): Promise<void> {
  const budget = await BudgetModel.findOne({ accountId, month }).lean();
  if (!budget || !isBudgetReady(budget.categories)) {
    unprocessable(
      "Precisa de criar um orcamento valido para este mes antes de adicionar lancamentos manuais",
      "BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS",
    );
  }
}

function ensureExpenseCategoryProvided(categoryId?: string): string {
  const cleanId = categoryId?.trim();
  if (!cleanId) {
    unprocessable("Categoria obrigatoria", "TRANSACTION_CATEGORY_REQUIRED");
  }
  return cleanId;
}

async function ensureCategoryForType(
  accountId: string,
  type: "income" | "expense",
  categoryId?: string,
): Promise<string> {
  if (type === "income") {
    await assertIncomeCategoryActive(accountId, categoryId);
    return categoryId!.trim();
  }

  return ensureExpenseCategoryProvided(categoryId);
}

export async function getMonthSummary(accountId: string, month: string): Promise<MonthSummaryDto> {
  const transactions = await TransactionModel.find({ accountId, month }).sort({ date: -1, createdAt: -1 });
  const txs = transactions.map((t) => toTransactionDto(t));

  const incomeTransactions = txs.filter((t) => t.type === "income");
  const expenseTransactions = txs.filter((t) => t.type === "expense");

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomeTransactions,
    expenseTransactions,
  };
}

export async function createTransaction(
  accountId: string,
  actorUserId: string,
  input: {
    month: string;
    date: string;
    type: "income" | "expense";
    origin: "manual" | "recurring";
    recurringRuleId?: string;
    description: string;
    amount: number;
    categoryId?: string;
  },
): Promise<TransactionDto> {
  const date = parseAndValidateDate(input.date, input.month);

  if (input.origin === "manual") {
    await ensureManualTransactionsAllowed(accountId, input.month);
  }

  const recurringRuleId =
    input.origin === "recurring" && input.recurringRuleId
      ? new Types.ObjectId(input.recurringRuleId)
      : null;
  const categoryId = await ensureCategoryForType(accountId, input.type, input.categoryId);

  const transaction = await TransactionModel.create({
    accountId,
    userId: actorUserId,
    month: input.month,
    date,
    type: input.type,
    origin: input.origin,
    recurringRuleId,
    description: input.description,
    amount: input.amount,
    categoryId,
  });

  if (transaction.type === "income") {
    await syncBudgetTotalFromTransactions(accountId, transaction.month);
  }

  return toTransactionDto(transaction);
}

export async function updateTransaction(
  accountId: string,
  actorUserId: string,
  transactionId: string,
  input: {
    date?: string;
    type?: "income" | "expense";
    description?: string;
    amount?: number;
    categoryId?: string;
  },
): Promise<TransactionDto> {
  const transaction = await TransactionModel.findOne({ _id: transactionId, accountId });
  if (!transaction) {
    notFound("Transacao nao encontrada", "TRANSACTION_NOT_FOUND");
  }

  const originalType = transaction.type;
  const originalMonth = transaction.month;
  let nextMonth = originalMonth;

  if (input.date) {
    const parsedDate = parseAndValidateDate(input.date);
    transaction.date = parsedDate;
    nextMonth = monthFromDate(parsedDate);
    transaction.month = nextMonth;
  }

  if (transaction.origin === "manual") {
    await ensureManualTransactionsAllowed(accountId, nextMonth);
  }

  const nextType = input.type ?? transaction.type;
  const nextCategoryId = input.categoryId ?? transaction.categoryId;
  const ensuredCategoryId = await ensureCategoryForType(accountId, nextType, nextCategoryId);

  if (input.type) {
    transaction.type = input.type;
  }

  if (input.description !== undefined) {
    transaction.description = input.description;
  }

  if (input.amount !== undefined) {
    transaction.amount = input.amount;
  }

  if (input.categoryId !== undefined) {
    transaction.categoryId = ensuredCategoryId;
  } else if (nextType === "income") {
    transaction.categoryId = ensuredCategoryId;
  }

  transaction.userId = new Types.ObjectId(actorUserId);
  await transaction.save();

  const monthsToSync = new Set<string>();
  if (originalType === "income") {
    monthsToSync.add(originalMonth);
  }
  if (transaction.type === "income") {
    monthsToSync.add(transaction.month);
  }
  for (const month of monthsToSync) {
    await syncBudgetTotalFromTransactions(accountId, month);
  }

  return toTransactionDto(transaction);
}

export async function deleteTransaction(accountId: string, transactionId: string): Promise<void> {
  const deleted = await TransactionModel.findOneAndDelete({ _id: transactionId, accountId });
  if (!deleted) {
    notFound("Transacao nao encontrada", "TRANSACTION_NOT_FOUND");
  }

  if (deleted.type === "income") {
    await syncBudgetTotalFromTransactions(accountId, deleted.month);
  }
}

export { toTransactionDto };
