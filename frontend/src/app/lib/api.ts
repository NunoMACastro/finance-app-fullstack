/**
 * API Client — Dual-mode: mock data (dev) or real HTTP calls (production).
 *
 * Controlled by `config.useMock` (env var VITE_USE_MOCK).
 *
 * ═══════════════════════════════════════════════════════════════
 * Backend API Endpoints Reference (Node.js / Express / Fastify)
 * ═══════════════════════════════════════════════════════════════
 *
 * Auth
 *   POST   /auth/login           { email, password }        → { tokens, user }
 *   POST   /auth/register        { name, email, password }  → { tokens, user }
 *   POST   /auth/refresh         { refreshToken }           → { accessToken, refreshToken }
 *   POST   /auth/logout          { refreshToken }           → 204
 *   GET    /auth/me                                         → UserProfile
 *   POST   /auth/tutorial/complete                          → UserProfile
 *
 * Transactions
 *   GET    /transactions?month=YYYY-MM                      → MonthSummary
 *   POST   /transactions         CreateTransactionDto       → Transaction
 *   PUT    /transactions/:id     UpdateTransactionDto       → Transaction
 *   DELETE /transactions/:id                                → 204
 *
 * Budget (per-month)
 *   GET    /budgets/templates                               → BudgetTemplate[]
 *   GET    /budgets/:month                                  → MonthBudget
 *   PUT    /budgets/:month       SaveBudgetDto              → MonthBudget
 *   POST   /budgets/:month/categories  AddCategoryDto       → MonthBudget
 *   DELETE /budgets/:month/categories/:categoryId           → MonthBudget
 *   POST   /budgets/:month/copy-from/:sourceMonth           → MonthBudget
 *
 * Recurring Rules
 *   GET    /recurring-rules                                 → RecurringRule[]
 *   POST   /recurring-rules      CreateRecurringRuleDto     → RecurringRule
 *   PUT    /recurring-rules/:id  UpdateRecurringRuleDto     → RecurringRule
 *   DELETE /recurring-rules/:id                             → 204
 *
 * Stats
 *   GET    /stats/semester?endingMonth=YYYY-MM               → StatsSnapshot
 *   GET    /stats/year?year=YYYY                             → StatsSnapshot
 */

import { config } from "./config";
import { httpClient } from "./http-client";
import type {
  Transaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  RecurringRule,
  CreateRecurringRuleDto,
  UpdateRecurringRuleDto,
  MonthBudget,
  SaveBudgetDto,
  AddCategoryDto,
  MonthSummary,
  StatsSnapshot,
  AuthTokens,
  AuthResponse,
  UserProfile,
  BudgetCategory,
  BudgetTemplate,
} from "./types";
import {
  mockUser,
  mockTransactions,
  mockRecurringRules,
  mockMonthBudget,
  getStatsSnapshot,
  getCategoryName,
} from "./mock-data";

// ── Mock helpers ────────────────────────────────────────────

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// Mutable mock state (only used when config.useMock === true)
let _mockUser: UserProfile = { ...mockUser };
let _mockTransactions = [...mockTransactions];
let _mockNextTxId = 100;
const _mockBudgets: Record<string, MonthBudget> = {
  [mockMonthBudget.month]: JSON.parse(JSON.stringify(mockMonthBudget)),
};
let _mockNextCatId = 100;

const MOCK_BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "conservador",
    name: "Conservador",
    categories: [
      { id: "tpl_conservador_despesas", name: "Despesas", percent: 50 },
      { id: "tpl_conservador_lazer", name: "Lazer", percent: 10 },
      { id: "tpl_conservador_investimento", name: "Investimento", percent: 20 },
      { id: "tpl_conservador_poupanca", name: "Poupanca", percent: 20 },
    ],
  },
  {
    id: "equilibrado",
    name: "Equilibrado",
    categories: [
      { id: "tpl_equilibrado_despesas", name: "Despesas", percent: 60 },
      { id: "tpl_equilibrado_lazer", name: "Lazer", percent: 5 },
      { id: "tpl_equilibrado_investimento", name: "Investimento", percent: 15 },
      { id: "tpl_equilibrado_poupanca", name: "Poupanca", percent: 20 },
    ],
  },
  {
    id: "agressivo",
    name: "Agressivo",
    categories: [
      { id: "tpl_agressivo_despesas", name: "Despesas", percent: 70 },
      { id: "tpl_agressivo_lazer", name: "Lazer", percent: 10 },
      { id: "tpl_agressivo_investimento", name: "Investimento", percent: 15 },
      { id: "tpl_agressivo_poupanca", name: "Poupanca", percent: 5 },
    ],
  },
];

function monthFromDateString(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isMockBudgetReady(categories: BudgetCategory[]): boolean {
  if (categories.length === 0) return false;
  const total = categories.reduce((sum, category) => sum + category.percent, 0);
  return Math.abs(total - 100) <= 0.01;
}

function sumMockIncomeForMonth(month: string): number {
  const total = _mockTransactions
    .filter((tx) => tx.month === month && tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  return Math.round(total * 100) / 100;
}

function normaliseMockBudget(month: string, budget?: MonthBudget): MonthBudget {
  const categories = clone(budget?.categories ?? []);
  return {
    userId: "u1",
    month,
    totalBudget: sumMockIncomeForMonth(month),
    categories,
    isReady: isMockBudgetReady(categories),
  };
}

function syncMockBudget(month: string): void {
  if (_mockBudgets[month]) {
    _mockBudgets[month] = normaliseMockBudget(month, _mockBudgets[month]);
  }
}

function ensureMockManualAllowed(month: string): void {
  const budget = _mockBudgets[month];
  if (!budget || !budget.isReady) {
    throw {
      code: "BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS",
      message: "Precisa de criar um orcamento valido para este mes antes de adicionar lancamentos manuais",
    };
  }
}

// ═══════════════════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════════════════

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    if (config.useMock) {
      await delay();
      _mockUser = { ..._mockUser, email };
      return {
        tokens: { accessToken: "mock-access-token", refreshToken: "mock-refresh-token" },
        user: { ..._mockUser },
      };
    }
    const { data } = await httpClient.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    if (config.useMock) {
      await delay();
      _mockUser = { ..._mockUser, name, email, tutorialSeenAt: null };
      return {
        tokens: { accessToken: "mock-access-token", refreshToken: "mock-refresh-token" },
        user: { ..._mockUser },
      };
    }
    const { data } = await httpClient.post<AuthResponse>("/auth/register", { name, email, password });
    return data;
  },

  async logout(refreshToken?: string): Promise<void> {
    if (config.useMock) {
      await delay(100);
      return;
    }
    await httpClient.post("/auth/logout", { refreshToken });
  },

  async getMe(): Promise<UserProfile> {
    if (config.useMock) {
      await delay(200);
      return { ..._mockUser };
    }
    const { data } = await httpClient.get<UserProfile>("/auth/me");
    return data;
  },

  async completeTutorial(): Promise<UserProfile> {
    if (config.useMock) {
      await delay(120);
      _mockUser = {
        ..._mockUser,
        tutorialSeenAt: new Date().toISOString(),
      };
      return { ..._mockUser };
    }
    const { data } = await httpClient.post<UserProfile>("/auth/tutorial/complete", {});
    return data;
  },
};

// ═══════════════════════════════════════════════════════════
// Transactions API
// ═══════════════════════════════════════════════════════════

export const transactionsApi = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    if (config.useMock) {
      await delay();
      const txs = _mockTransactions.filter((t) => t.month === month);
      const income = txs.filter((t) => t.type === "income");
      const expense = txs.filter((t) => t.type === "expense");
      const totalIncome = income.reduce((s, t) => s + t.amount, 0);
      const totalExpense = expense.reduce((s, t) => s + t.amount, 0);
      return {
        month,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeTransactions: income,
        expenseTransactions: expense,
      };
    }
    const { data } = await httpClient.get<MonthSummary>("/transactions", { params: { month } });
    return data;
  },

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    if (config.useMock) {
      await delay();
      if (dto.origin === "manual") {
        ensureMockManualAllowed(dto.month);
      }

      const newTx: Transaction = {
        ...dto,
        id: `t${_mockNextTxId++}`,
        userId: "u1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      _mockTransactions.push(newTx);
      if (newTx.type === "income") {
        syncMockBudget(newTx.month);
      }
      return newTx;
    }
    const { data } = await httpClient.post<Transaction>("/transactions", dto);
    return data;
  },

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    if (config.useMock) {
      await delay();
      const idx = _mockTransactions.findIndex((t) => t.id === id);
      if (idx >= 0) {
        const current = _mockTransactions[idx];
        const nextMonth = dto.date ? monthFromDateString(dto.date) : current.month;
        if (current.origin === "manual") {
          ensureMockManualAllowed(nextMonth);
        }

        const next: Transaction = {
          ...current,
          ...dto,
          ...(dto.date ? { month: nextMonth } : {}),
          updatedAt: new Date().toISOString(),
        };
        _mockTransactions[idx] = next;

        if (current.type === "income") {
          syncMockBudget(current.month);
        }
        if (next.type === "income") {
          syncMockBudget(next.month);
        }

        return { ...next };
      }
      throw { code: "NOT_FOUND", message: "Transacao nao encontrada" };
    }
    const { data } = await httpClient.put<Transaction>(`/transactions/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    if (config.useMock) {
      await delay();
      const deleted = _mockTransactions.find((t) => t.id === id);
      _mockTransactions = _mockTransactions.filter((t) => t.id !== id);
      if (deleted?.type === "income") {
        syncMockBudget(deleted.month);
      }
      return;
    }
    await httpClient.delete(`/transactions/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════
// Recurring Rules API
// ═══════════════════════════════════════════════════════════

let _mockRules = [...mockRecurringRules];
let _mockNextRuleId = 100;

export const recurringApi = {
  async list(): Promise<RecurringRule[]> {
    if (config.useMock) {
      await delay();
      return [..._mockRules];
    }
    const { data } = await httpClient.get<RecurringRule[]>("/recurring-rules");
    return data;
  },

  async create(dto: CreateRecurringRuleDto): Promise<RecurringRule> {
    if (config.useMock) {
      await delay();
      const rule: RecurringRule = {
        ...dto,
        id: `rr${_mockNextRuleId++}`,
        userId: "u1",
        active: true,
      };
      _mockRules.push(rule);
      return rule;
    }
    const { data } = await httpClient.post<RecurringRule>("/recurring-rules", dto);
    return data;
  },

  async update(id: string, dto: UpdateRecurringRuleDto): Promise<RecurringRule> {
    if (config.useMock) {
      await delay();
      const idx = _mockRules.findIndex((r) => r.id === id);
      if (idx >= 0) {
        _mockRules[idx] = { ..._mockRules[idx], ...dto };
        return { ..._mockRules[idx] };
      }
      throw { code: "NOT_FOUND", message: "Regra recorrente nao encontrada" };
    }
    const { data } = await httpClient.put<RecurringRule>(`/recurring-rules/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    if (config.useMock) {
      await delay();
      _mockRules = _mockRules.filter((r) => r.id !== id);
      return;
    }
    await httpClient.delete(`/recurring-rules/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════
// Budget API (per-month)
// ═══════════════════════════════════════════════════════════

export const budgetApi = {
  async getTemplates(): Promise<BudgetTemplate[]> {
    if (config.useMock) {
      await delay(120);
      return clone(MOCK_BUDGET_TEMPLATES);
    }
    const { data } = await httpClient.get<BudgetTemplate[]>("/budgets/templates");
    return data;
  },

  async get(month: string): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      if (_mockBudgets[month]) {
        _mockBudgets[month] = normaliseMockBudget(month, _mockBudgets[month]);
        return clone(_mockBudgets[month]);
      }
      return normaliseMockBudget(month);
    }
    const { data } = await httpClient.get<MonthBudget>(`/budgets/${month}`);
    return data;
  },

  async save(month: string, dto: SaveBudgetDto): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const budget = normaliseMockBudget(month, {
        userId: "u1",
        month,
        totalBudget: dto.totalBudget,
        categories: dto.categories,
        isReady: false,
      });
      _mockBudgets[month] = clone(budget);
      return clone(budget);
    }
    const { data } = await httpClient.put<MonthBudget>(`/budgets/${month}`, dto);
    return data;
  },

  async addCategory(month: string, dto: AddCategoryDto): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const budget = _mockBudgets[month] ?? normaliseMockBudget(month);
      const newCat: BudgetCategory = { ...dto, id: `cat${_mockNextCatId++}` };
      budget.categories.push(newCat);
      _mockBudgets[month] = normaliseMockBudget(month, budget);
      return clone(_mockBudgets[month]);
    }
    const { data } = await httpClient.post<MonthBudget>(`/budgets/${month}/categories`, dto);
    return data;
  },

  async removeCategory(month: string, categoryId: string): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const budget = _mockBudgets[month] ?? normaliseMockBudget(month);
      budget.categories = budget.categories.filter((c) => c.id !== categoryId);
      _mockBudgets[month] = normaliseMockBudget(month, budget);
      return clone(_mockBudgets[month]);
    }
    const { data } = await httpClient.delete<MonthBudget>(`/budgets/${month}/categories/${categoryId}`);
    return data;
  },

  async copyFrom(targetMonth: string, sourceMonth: string): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const source = _mockBudgets[sourceMonth];
      if (!source) throw { code: "NOT_FOUND", message: "Mes de origem nao encontrado" };
      const copy = normaliseMockBudget(targetMonth, {
        userId: "u1",
        month: targetMonth,
        totalBudget: 0,
        categories: clone(source.categories),
        isReady: false,
      });
      _mockBudgets[targetMonth] = clone(copy);
      return clone(copy);
    }
    const { data } = await httpClient.post<MonthBudget>(`/budgets/${targetMonth}/copy-from/${sourceMonth}`);
    return data;
  },
};

// ═══════════════════════════════════════════════════════════
// Stats API
// ═══════════════════════════════════════════════════════════

export const statsApi = {
  async getSemester(endingMonth?: string): Promise<StatsSnapshot> {
    if (config.useMock) {
      await delay(500);
      return getStatsSnapshot("semester");
    }
    const { data } = await httpClient.get<StatsSnapshot>("/stats/semester", {
      params: endingMonth ? { endingMonth } : undefined,
    });
    return data;
  },

  async getYear(year?: number): Promise<StatsSnapshot> {
    if (config.useMock) {
      await delay(500);
      return getStatsSnapshot("year");
    }
    const { data } = await httpClient.get<StatsSnapshot>("/stats/year", {
      params: year ? { year } : undefined,
    });
    return data;
  },
};

// ═══════════════════════════════════════════════════════════
// Utility re-exports (for components that need category names)
// ═══════════════════════════════════════════════════════════

/**
 * Get category name from a list of categories.
 * In real mode the categories come from the budget API response.
 * In mock mode falls back to the default categories.
 */
export function resolveCategoryName(
  categoryId: string,
  categories?: BudgetCategory[],
): string {
  if (categories) {
    const found = categories.find((c) => c.id === categoryId);
    if (found) return found.name;
  }
  // Fallback to mock helper (only useful in mock mode)
  return getCategoryName(categoryId);
}
