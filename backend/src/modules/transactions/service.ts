import { Types } from "mongoose";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { monthFromDate } from "../../lib/month.js";
import { BudgetModel } from "../../models/budget.model.js";
import { TransactionModel } from "../../models/transaction.model.js";
import {
  isBudgetReady,
  isProtectedBudgetCategoryId,
  syncBudgetTotalFromTransactions,
} from "../budgets/service.js";
import { assertIncomeCategoryActive } from "../income-categories/service.js";
import { markStatsInsightsStaleForAccount } from "../stats/service.js";

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
  categoryResolution: "direct" | "fallback";
  requestedCategoryId?: string;
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

interface TransactionCursor {
  date: string;
  id: string;
}

interface TransactionListDto {
  items: TransactionDto[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalAmount: number;
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
  categoryResolution?: "direct" | "fallback";
  requestedCategoryId?: string | null;
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
    categoryResolution: doc.categoryResolution ?? "direct",
    ...(doc.requestedCategoryId ? { requestedCategoryId: doc.requestedCategoryId } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function parseAndValidateDate(date: string, expectedMonth?: string): Date {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    unprocessable("Data inválida", "INVALID_DATE");
  }

  if (expectedMonth && monthFromDate(parsed) !== expectedMonth) {
    unprocessable("A data não corresponde ao mês indicado", "DATE_MONTH_MISMATCH");
  }

  return parsed;
}

async function ensureManualTransactionsAllowed(accountId: string, month: string): Promise<void> {
  const budget = await BudgetModel.findOne({ accountId, month }).lean();
  if (!budget || !isBudgetReady(budget.categories)) {
    unprocessable(
      "Precisa de criar um orçamento válido para este mês antes de adicionar lançamentos manuais",
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

async function ensureExpenseCategoryForMonth(
  accountId: string,
  month: string,
  categoryId?: string,
  options?: { allowProtected?: boolean },
): Promise<string> {
  const cleanId = ensureExpenseCategoryProvided(categoryId);

  if (isProtectedBudgetCategoryId(cleanId) && !options?.allowProtected) {
    unprocessable("Categoria protegida não pode ser usada manualmente", "TRANSACTION_CATEGORY_PROTECTED");
  }

  const budget = await BudgetModel.findOne({
    accountId,
    month,
    "categories.id": cleanId,
  })
    .select({ _id: 1 })
    .lean();

  if (!budget) {
    unprocessable("Categoria inválida para o orçamento do mês", "TRANSACTION_CATEGORY_INVALID");
  }

  return cleanId;
}

async function ensureCategoryForType(
  accountId: string,
  month: string,
  type: "income" | "expense",
  categoryId?: string,
  options?: { allowProtectedExpense?: boolean },
): Promise<string> {
  if (type === "income") {
    await assertIncomeCategoryActive(accountId, categoryId);
    return categoryId!.trim();
  }

  return ensureExpenseCategoryForMonth(accountId, month, categoryId, {
    allowProtected: options?.allowProtectedExpense,
  });
}

function encodeCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(cursor?: string): TransactionCursor | null {
  if (!cursor) return null;

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as TransactionCursor;
    if (!decoded?.date || !decoded?.id || !Types.ObjectId.isValid(decoded.id)) {
      unprocessable("Cursor inválido", "TRANSACTION_CURSOR_INVALID");
    }
    return decoded;
  } catch {
    unprocessable("Cursor inválido", "TRANSACTION_CURSOR_INVALID");
  }
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

export async function listTransactions(
  accountId: string,
  query: {
    month: string;
    type?: "income" | "expense";
    categoryId?: string;
    origin?: "manual" | "recurring";
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
    limit?: number;
  },
): Promise<TransactionListDto> {
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    unprocessable("Intervalo de datas inválido", "TRANSACTION_DATE_RANGE_INVALID");
  }

  const limit = query.limit ?? 50;
  const filter: Record<string, unknown> = {
    accountId,
    month: query.month,
  };

  if (query.type) filter.type = query.type;
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.origin) filter.origin = query.origin;
  if (query.dateFrom || query.dateTo) {
    filter.date = {
      ...(query.dateFrom ? { $gte: parseAndValidateDate(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: parseAndValidateDate(query.dateTo) } : {}),
    };
  }

  const decodedCursor = decodeCursor(query.cursor);
  if (decodedCursor) {
    const cursorDate = parseAndValidateDate(decodedCursor.date);
    filter.$or = [
      { date: { $lt: cursorDate } },
      { date: cursorDate, _id: { $lt: new Types.ObjectId(decodedCursor.id) } },
    ];
  }

  const results = await TransactionModel.find(filter)
    .sort({ date: -1, _id: -1 })
    .limit(limit + 1);
  const aggregate = await TransactionModel.aggregate<{ _id: null; totalCount: number; totalAmount: number }>([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const hasMore = results.length > limit;
  const items = results.slice(0, limit).map((transaction) => toTransactionDto(transaction));
  const last = results[limit - 1];
  const totals = aggregate[0] ?? { totalCount: 0, totalAmount: 0 };

  return {
    items,
    hasMore,
    totalCount: totals.totalCount,
    totalAmount: Math.round(totals.totalAmount * 100) / 100,
    nextCursor: hasMore && last
      ? encodeCursor({
          date: last.date.toISOString().slice(0, 10),
          id: last._id.toString(),
        })
      : null,
  };
}

export async function createTransaction(
  accountId: string,
  actorUserId: string,
  input: {
    month: string;
    date: string;
    type: "income" | "expense";
    description: string;
    amount: number;
    categoryId?: string;
  },
): Promise<TransactionDto> {
  const date = parseAndValidateDate(input.date, input.month);

  await ensureManualTransactionsAllowed(accountId, input.month);

  const categoryId = await ensureCategoryForType(accountId, input.month, input.type, input.categoryId);

  const transaction = await TransactionModel.create({
    accountId,
    userId: actorUserId,
    month: input.month,
    date,
    type: input.type,
    origin: "manual",
    recurringRuleId: null,
    description: input.description,
    amount: input.amount,
    categoryId,
    categoryResolution: "direct",
    requestedCategoryId: null,
  });

  if (transaction.type === "income") {
    await syncBudgetTotalFromTransactions(accountId, transaction.month);
  }

  await markStatsInsightsStaleForAccount(accountId);

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
    notFound("Transação não encontrada", "TRANSACTION_NOT_FOUND");
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
  const ensuredCategoryId = await ensureCategoryForType(accountId, nextMonth, nextType, nextCategoryId, {
    allowProtectedExpense: input.categoryId === undefined && isProtectedBudgetCategoryId(transaction.categoryId),
  });

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
  if (input.categoryId !== undefined || input.type !== undefined) {
    transaction.categoryResolution = "direct";
    transaction.requestedCategoryId = null;
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

  await markStatsInsightsStaleForAccount(accountId);

  return toTransactionDto(transaction);
}

export async function deleteTransaction(accountId: string, transactionId: string): Promise<void> {
  const deleted = await TransactionModel.findOneAndDelete({ _id: transactionId, accountId });
  if (!deleted) {
    notFound("Transação não encontrada", "TRANSACTION_NOT_FOUND");
  }

  if (deleted.type === "income") {
    await syncBudgetTotalFromTransactions(accountId, deleted.month);
  }

  await markStatsInsightsStaleForAccount(accountId);
}

export { toTransactionDto };
