import { Types } from "mongoose";
import { notFound, unprocessable } from "../../lib/api-error.js";
import { monthFromDate } from "../../lib/month.js";
import { TransactionModel } from "../../models/transaction.model.js";

interface TransactionDto {
  id: string;
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

export async function getMonthSummary(userId: string, month: string): Promise<MonthSummaryDto> {
  const transactions = await TransactionModel.find({ userId, month }).sort({ date: -1, createdAt: -1 });
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
  userId: string,
  input: {
    month: string;
    date: string;
    type: "income" | "expense";
    origin: "manual" | "recurring";
    recurringRuleId?: string;
    description: string;
    amount: number;
    categoryId: string;
  },
): Promise<TransactionDto> {
  const date = parseAndValidateDate(input.date, input.month);

  const recurringRuleId =
    input.origin === "recurring" && input.recurringRuleId
      ? new Types.ObjectId(input.recurringRuleId)
      : null;

  const transaction = await TransactionModel.create({
    userId,
    month: input.month,
    date,
    type: input.type,
    origin: input.origin,
    recurringRuleId,
    description: input.description,
    amount: input.amount,
    categoryId: input.categoryId,
  });

  return toTransactionDto(transaction);
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: {
    date?: string;
    type?: "income" | "expense";
    description?: string;
    amount?: number;
    categoryId?: string;
  },
): Promise<TransactionDto> {
  const transaction = await TransactionModel.findOne({ _id: transactionId, userId });
  if (!transaction) {
    notFound("Transacao nao encontrada", "TRANSACTION_NOT_FOUND");
  }

  if (input.date) {
    const parsedDate = parseAndValidateDate(input.date);
    transaction.date = parsedDate;
    transaction.month = monthFromDate(parsedDate);
  }

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
    transaction.categoryId = input.categoryId;
  }

  await transaction.save();
  return toTransactionDto(transaction);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const result = await TransactionModel.deleteOne({ _id: transactionId, userId });
  if (result.deletedCount === 0) {
    notFound("Transacao nao encontrada", "TRANSACTION_NOT_FOUND");
  }
}

export { toTransactionDto };
