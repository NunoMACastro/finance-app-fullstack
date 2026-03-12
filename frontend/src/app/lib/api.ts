import { config } from "./config";
import { httpClient } from "./http-client";
import { getActiveAccountIdHeader } from "./account-store";
import type {
  AddCategoryDto,
  AccountMember,
  AccountRole,
  AccountSummary,
  AuthResponse,
  BudgetCategory,
  BudgetTemplate,
  CreateRecurringRuleDto,
  CreateTransactionDto,
  InviteCodeResponse,
  IncomeCategory,
  MonthBudget,
  MonthSummary,
  RecurringRule,
  SaveBudgetDto,
  StatsSnapshot,
  Transaction,
  UpdateRecurringRuleDto,
  UpdateTransactionDto,
  UserProfile,
} from "./types";
import {
  PERSONAL_ACCOUNT_ID,
  buildDefaultIncomeCategories,
  getCategoryName,
  getIncomeCategoryName,
  getStatsSnapshot,
  mockMonthBudget,
  mockRecurringRules,
  mockTransactions,
  mockUser,
} from "./mock-data";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

let _mockUser: UserProfile = clone(mockUser);
let _mockTransactions: Transaction[] = clone(mockTransactions);
let _mockRecurringRules: RecurringRule[] = clone(mockRecurringRules);
let _mockNextTxId = 100;
let _mockNextRuleId = 100;
let _mockNextCatId = 100;

let _mockAccounts: AccountSummary[] = [
  {
    id: PERSONAL_ACCOUNT_ID,
    name: "Conta Pessoal",
    type: "personal",
    role: "owner",
    isPersonalDefault: true,
  },
];

let _mockMembersByAccount: Record<string, AccountMember[]> = {
  [PERSONAL_ACCOUNT_ID]: [
    {
      userId: "u1",
      name: _mockUser.name,
      email: _mockUser.email,
      role: "owner",
      status: "active",
    },
  ],
};

const _mockInviteCodes: Record<string, { accountId: string; expiresAt: string }> = {};
let _mockInviteCodeCounter = 1;

const _mockBudgetsByAccount: Record<string, Record<string, MonthBudget>> = {
  [PERSONAL_ACCOUNT_ID]: {
    [mockMonthBudget.month]: clone(mockMonthBudget),
  },
};

const _mockIncomeCategoriesByAccount: Record<string, IncomeCategory[]> = {
  [PERSONAL_ACCOUNT_ID]: buildDefaultIncomeCategories(PERSONAL_ACCOUNT_ID),
};

function mockAccountId(): string {
  return getActiveAccountIdHeader() ?? _mockUser.personalAccountId;
}

function monthFromDateString(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isMockBudgetReady(categories: BudgetCategory[]): boolean {
  if (categories.length === 0) return false;
  const total = categories.reduce((sum, category) => sum + category.percent, 0);
  return Math.abs(total - 100) <= 0.01;
}

function ensureBudgetStore(accountId: string): Record<string, MonthBudget> {
  if (!_mockBudgetsByAccount[accountId]) {
    _mockBudgetsByAccount[accountId] = {};
  }
  return _mockBudgetsByAccount[accountId];
}

function ensureIncomeCategoryStore(accountId: string): IncomeCategory[] {
  if (!_mockIncomeCategoriesByAccount[accountId]) {
    _mockIncomeCategoriesByAccount[accountId] = buildDefaultIncomeCategories(accountId);
  }
  return _mockIncomeCategoriesByAccount[accountId];
}

function ensureMockIncomeCategoryAllowed(accountId: string, categoryId?: string): string {
  const cleanId = categoryId?.trim();
  if (!cleanId) {
    throw {
      code: "INCOME_CATEGORY_REQUIRED",
      message: "Categoria de receita obrigatória",
    };
  }

  const category = ensureIncomeCategoryStore(accountId).find((item) => item.id === cleanId);
  if (!category) {
    throw {
      code: "INCOME_CATEGORY_NOT_FOUND",
      message: "Categoria de receita não encontrada",
    };
  }

  if (!category.active) {
    throw {
      code: "INCOME_CATEGORY_INACTIVE",
      message: "Categoria de receita inativa",
    };
  }

  return cleanId;
}

function sumMockIncomeForMonth(accountId: string, month: string): number {
  const total = _mockTransactions
    .filter((tx) => tx.accountId === accountId && tx.month === month && tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  return Math.round(total * 100) / 100;
}

function normaliseMockBudget(accountId: string, month: string, budget?: MonthBudget): MonthBudget {
  const categories = clone(budget?.categories ?? []);
  return {
    accountId,
    month,
    totalBudget: sumMockIncomeForMonth(accountId, month),
    categories,
    isReady: isMockBudgetReady(categories),
  };
}

function syncMockBudget(accountId: string, month: string): void {
  const store = ensureBudgetStore(accountId);
  if (store[month]) {
    store[month] = normaliseMockBudget(accountId, month, store[month]);
  }
}

function ensureMockManualAllowed(accountId: string, month: string): void {
  const store = ensureBudgetStore(accountId);
  const budget = store[month];
  if (!budget || !budget.isReady) {
    throw {
      code: "BUDGET_REQUIRED_FOR_MANUAL_TRANSACTIONS",
      message: "Precisa de criar um orçamento válido para este mês antes de adicionar lançamentos manuais",
    };
  }
}

function requireMockOwner(accountId: string): void {
  const account = _mockAccounts.find((item) => item.id === accountId);
  if (!account) {
    throw { code: "ACCOUNT_NOT_FOUND", message: "Conta não encontrada" };
  }
  if (account.role !== "owner") {
    throw { code: "ACCOUNT_OWNER_REQUIRED", message: "Apenas owners podem gerir esta conta" };
  }
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    if (config.useMock) {
      await delay();
      void password;
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
      void password;
      _mockUser = {
        ..._mockUser,
        name,
        email,
        tutorialSeenAt: null,
        personalAccountId: PERSONAL_ACCOUNT_ID,
      };
      _mockAccounts = [
        {
          id: PERSONAL_ACCOUNT_ID,
          name: "Conta Pessoal",
          type: "personal",
          role: "owner",
          isPersonalDefault: true,
        },
      ];
      _mockMembersByAccount = {
        [PERSONAL_ACCOUNT_ID]: [
          {
            userId: "u1",
            name,
            email,
            role: "owner",
            status: "active",
          },
        ],
      };
      _mockTransactions = clone(mockTransactions);
      _mockRecurringRules = clone(mockRecurringRules);
      for (const accountId of Object.keys(_mockIncomeCategoriesByAccount)) {
        delete _mockIncomeCategoriesByAccount[accountId];
      }
      _mockIncomeCategoriesByAccount[PERSONAL_ACCOUNT_ID] = buildDefaultIncomeCategories(PERSONAL_ACCOUNT_ID);
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
      await delay(120);
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

export const accountsApi = {
  async list(): Promise<AccountSummary[]> {
    if (config.useMock) {
      await delay(100);
      return clone(_mockAccounts);
    }
    const { data } = await httpClient.get<AccountSummary[]>("/accounts");
    return data;
  },

  async create(name: string): Promise<AccountSummary> {
    if (config.useMock) {
      await delay(120);
      const account: AccountSummary = {
        id: `acc_shared_${Date.now()}`,
        name: name.trim(),
        type: "shared",
        role: "owner",
        isPersonalDefault: false,
      };
      _mockAccounts.push(account);
      _mockMembersByAccount[account.id] = [
        {
          userId: "u1",
          name: _mockUser.name,
          email: _mockUser.email,
          role: "owner",
          status: "active",
        },
      ];
      _mockIncomeCategoriesByAccount[account.id] = buildDefaultIncomeCategories(account.id);
      return clone(account);
    }
    const { data } = await httpClient.post<AccountSummary>("/accounts", { name });
    return data;
  },

  async joinByCode(code: string): Promise<AccountSummary> {
    if (config.useMock) {
      await delay(120);
      const invite = _mockInviteCodes[code.trim().toUpperCase()];
      if (!invite) {
        throw { code: "INVITE_CODE_INVALID_OR_EXPIRED", message: "Código de convite inválido" };
      }
      const account = _mockAccounts.find((item) => item.id === invite.accountId);
      if (!account) {
        throw { code: "ACCOUNT_NOT_FOUND", message: "Conta não encontrada" };
      }
      ensureIncomeCategoryStore(account.id);
      return clone(account);
    }
    const { data } = await httpClient.post<AccountSummary>("/accounts/join", { code });
    return data;
  },

  async generateInviteCode(accountId: string): Promise<InviteCodeResponse> {
    if (config.useMock) {
      await delay(100);
      requireMockOwner(accountId);
      const code = `CODE${String(_mockInviteCodeCounter++).padStart(4, "0")}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      _mockInviteCodes[code] = { accountId, expiresAt };
      return { code, expiresAt };
    }
    const { data } = await httpClient.post<InviteCodeResponse>(`/accounts/${accountId}/invite-codes`, {});
    return data;
  },

  async listMembers(accountId: string): Promise<AccountMember[]> {
    if (config.useMock) {
      await delay(100);
      requireMockOwner(accountId);
      return clone(_mockMembersByAccount[accountId] ?? []);
    }
    const { data } = await httpClient.get<AccountMember[]>(`/accounts/${accountId}/members`);
    return data;
  },

  async updateMemberRole(accountId: string, userId: string, role: AccountRole): Promise<AccountMember> {
    if (config.useMock) {
      await delay(100);
      requireMockOwner(accountId);
      const members = _mockMembersByAccount[accountId] ?? [];
      const target = members.find((member) => member.userId === userId);
      if (!target) throw { code: "ACCOUNT_MEMBER_NOT_FOUND", message: "Membro não encontrado" };

      if (target.role === "owner" && role !== "owner") {
        const ownerCount = members.filter((member) => member.role === "owner" && member.status === "active").length;
        if (ownerCount <= 1) {
          throw { code: "LAST_OWNER_PROTECTION", message: "A conta precisa de pelo menos um owner" };
        }
      }

      target.role = role;
      const account = _mockAccounts.find((item) => item.id === accountId);
      if (account && userId === "u1") {
        account.role = role;
      }
      return clone(target);
    }
    const { data } = await httpClient.patch<AccountMember>(`/accounts/${accountId}/members/${userId}/role`, { role });
    return data;
  },

  async removeMember(accountId: string, userId: string): Promise<void> {
    if (config.useMock) {
      await delay(100);
      requireMockOwner(accountId);
      const members = _mockMembersByAccount[accountId] ?? [];
      const target = members.find((member) => member.userId === userId);
      if (!target) throw { code: "ACCOUNT_MEMBER_NOT_FOUND", message: "Membro não encontrado" };
      if (target.role === "owner") {
        const ownerCount = members.filter((member) => member.role === "owner" && member.status === "active").length;
        if (ownerCount <= 1) {
          throw { code: "LAST_OWNER_PROTECTION", message: "A conta precisa de pelo menos um owner" };
        }
      }
      _mockMembersByAccount[accountId] = members.filter((member) => member.userId !== userId);
      return;
    }
    await httpClient.delete(`/accounts/${accountId}/members/${userId}`);
  },

  async leave(accountId: string): Promise<void> {
    if (config.useMock) {
      await delay(100);
      const account = _mockAccounts.find((item) => item.id === accountId);
      if (!account) throw { code: "ACCOUNT_NOT_FOUND", message: "Conta não encontrada" };
      if (account.type === "personal") {
        throw { code: "PERSONAL_ACCOUNT_CANNOT_LEAVE", message: "Não é possível sair da conta pessoal" };
      }
      if (account.role === "owner") {
        const members = _mockMembersByAccount[accountId] ?? [];
        const ownerCount = members.filter((member) => member.role === "owner" && member.status === "active").length;
        if (ownerCount <= 1) {
          throw {
            code: "LAST_OWNER_CANNOT_LEAVE",
            message: "Não pode sair da conta sendo o último owner",
          };
        }
      }
      _mockAccounts = _mockAccounts.filter((item) => item.id !== accountId);
      delete _mockMembersByAccount[accountId];
      delete _mockBudgetsByAccount[accountId];
      delete _mockIncomeCategoriesByAccount[accountId];
      _mockTransactions = _mockTransactions.filter((tx) => tx.accountId !== accountId);
      _mockRecurringRules = _mockRecurringRules.filter((rule) => rule.accountId !== accountId);
      return;
    }
    await httpClient.post(`/accounts/${accountId}/leave`, {});
  },
};

export const incomeCategoriesApi = {
  async list(): Promise<IncomeCategory[]> {
    if (config.useMock) {
      await delay(100);
      return clone(ensureIncomeCategoryStore(mockAccountId()));
    }
    const { data } = await httpClient.get<IncomeCategory[]>("/income-categories");
    return data;
  },

  async create(name: string): Promise<IncomeCategory> {
    if (config.useMock) {
      await delay(120);
      const accountId = mockAccountId();
      const nowIso = new Date().toISOString();
      const category: IncomeCategory = {
        id: `inc_${Date.now()}`,
        accountId,
        name: name.trim(),
        active: true,
        isDefault: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      ensureIncomeCategoryStore(accountId).push(category);
      return clone(category);
    }
    const { data } = await httpClient.post<IncomeCategory>("/income-categories", { name });
    return data;
  },

  async update(id: string, payload: { name?: string; active?: boolean }): Promise<IncomeCategory> {
    if (config.useMock) {
      await delay(120);
      const accountId = mockAccountId();
      const categories = ensureIncomeCategoryStore(accountId);
      const target = categories.find((item) => item.id === id);
      if (!target) {
        throw { code: "INCOME_CATEGORY_NOT_FOUND", message: "Categoria de receita não encontrada" };
      }
      if (target.isDefault && payload.active === false) {
        throw {
          code: "INCOME_CATEGORY_DEFAULT_PROTECTED",
          message: "A categoria default não pode ser desativada",
        };
      }
      if (payload.name !== undefined) {
        target.name = payload.name.trim();
      }
      if (payload.active !== undefined) {
        target.active = payload.active;
      }
      target.updatedAt = new Date().toISOString();
      return clone(target);
    }
    const { data } = await httpClient.patch<IncomeCategory>(`/income-categories/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    if (config.useMock) {
      await delay(120);
      const accountId = mockAccountId();
      const categories = ensureIncomeCategoryStore(accountId);
      const target = categories.find((item) => item.id === id);
      if (!target) {
        throw { code: "INCOME_CATEGORY_NOT_FOUND", message: "Categoria de receita não encontrada" };
      }
      if (target.isDefault) {
        throw {
          code: "INCOME_CATEGORY_DEFAULT_PROTECTED",
          message: "A categoria default não pode ser removida",
        };
      }
      target.active = false;
      target.updatedAt = new Date().toISOString();
      return;
    }
    await httpClient.delete(`/income-categories/${id}`);
  },
};

export const transactionsApi = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const txs = _mockTransactions.filter((t) => t.accountId === accountId && t.month === month);
      const income = txs.filter((t) => t.type === "income");
      const expense = txs.filter((t) => t.type === "expense");
      const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0);
      const totalExpense = expense.reduce((sum, tx) => sum + tx.amount, 0);
      return {
        month,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeTransactions: clone(income),
        expenseTransactions: clone(expense),
      };
    }
    const { data } = await httpClient.get<MonthSummary>("/transactions", { params: { month } });
    return data;
  },

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      if (dto.origin === "manual") {
        ensureMockManualAllowed(accountId, dto.month);
      }
      if (dto.type === "income") {
        ensureMockIncomeCategoryAllowed(accountId, dto.categoryId);
      }

      const tx: Transaction = {
        ...dto,
        id: `t${_mockNextTxId++}`,
        accountId,
        userId: "u1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      _mockTransactions.push(tx);
      if (tx.type === "income") {
        syncMockBudget(accountId, tx.month);
      }
      return clone(tx);
    }
    const { data } = await httpClient.post<Transaction>("/transactions", dto);
    return data;
  },

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const idx = _mockTransactions.findIndex((tx) => tx.id === id && tx.accountId === accountId);
      if (idx < 0) {
        throw { code: "TRANSACTION_NOT_FOUND", message: "Transação não encontrada" };
      }

      const current = _mockTransactions[idx];
      const nextMonth = dto.date ? monthFromDateString(dto.date) : current.month;
      if (current.origin === "manual") {
        ensureMockManualAllowed(accountId, nextMonth);
      }
      const nextType = dto.type ?? current.type;
      const nextCategoryId = dto.categoryId ?? current.categoryId;
      if (nextType === "income") {
        ensureMockIncomeCategoryAllowed(accountId, nextCategoryId);
      }

      const next: Transaction = {
        ...current,
        ...dto,
        ...(dto.date ? { month: nextMonth } : {}),
        updatedAt: new Date().toISOString(),
      };

      _mockTransactions[idx] = next;

      if (current.type === "income") {
        syncMockBudget(accountId, current.month);
      }
      if (next.type === "income") {
        syncMockBudget(accountId, next.month);
      }

      return clone(next);
    }
    const { data } = await httpClient.put<Transaction>(`/transactions/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const deleted = _mockTransactions.find((tx) => tx.id === id && tx.accountId === accountId);
      _mockTransactions = _mockTransactions.filter((tx) => !(tx.id === id && tx.accountId === accountId));
      if (deleted?.type === "income") {
        syncMockBudget(accountId, deleted.month);
      }
      return;
    }
    await httpClient.delete(`/transactions/${id}`);
  },
};

export const recurringApi = {
  async list(): Promise<RecurringRule[]> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      return clone(_mockRecurringRules.filter((rule) => rule.accountId === accountId));
    }
    const { data } = await httpClient.get<RecurringRule[]>("/recurring-rules");
    return data;
  },

  async create(dto: CreateRecurringRuleDto): Promise<RecurringRule> {
    if (config.useMock) {
      await delay();
      if (dto.type === "income") {
        ensureMockIncomeCategoryAllowed(mockAccountId(), dto.categoryId);
      }
      const rule: RecurringRule = {
        ...dto,
        id: `rr${_mockNextRuleId++}`,
        accountId: mockAccountId(),
        userId: "u1",
        active: true,
      };
      _mockRecurringRules.push(rule);
      return clone(rule);
    }
    const { data } = await httpClient.post<RecurringRule>("/recurring-rules", dto);
    return data;
  },

  async update(id: string, dto: UpdateRecurringRuleDto): Promise<RecurringRule> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const idx = _mockRecurringRules.findIndex((rule) => rule.id === id && rule.accountId === accountId);
      if (idx < 0) {
        throw { code: "RECURRING_RULE_NOT_FOUND", message: "Regra recorrente não encontrada" };
      }
      const current = _mockRecurringRules[idx];
      if (current.type === "income") {
        ensureMockIncomeCategoryAllowed(accountId, dto.categoryId ?? current.categoryId);
      }
      _mockRecurringRules[idx] = { ..._mockRecurringRules[idx], ...dto };
      return clone(_mockRecurringRules[idx]);
    }
    const { data } = await httpClient.put<RecurringRule>(`/recurring-rules/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      _mockRecurringRules = _mockRecurringRules.filter((rule) => !(rule.id === id && rule.accountId === accountId));
      return;
    }
    await httpClient.delete(`/recurring-rules/${id}`);
  },
};

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
      const accountId = mockAccountId();
      const store = ensureBudgetStore(accountId);
      if (store[month]) {
        store[month] = normaliseMockBudget(accountId, month, store[month]);
        return clone(store[month]);
      }
      return normaliseMockBudget(accountId, month);
    }
    const { data } = await httpClient.get<MonthBudget>(`/budgets/${month}`);
    return data;
  },

  async save(month: string, dto: SaveBudgetDto): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const store = ensureBudgetStore(accountId);
      const budget = normaliseMockBudget(accountId, month, {
        accountId,
        month,
        totalBudget: dto.totalBudget,
        categories: dto.categories,
        isReady: false,
      });
      store[month] = clone(budget);
      return clone(budget);
    }
    const { data } = await httpClient.put<MonthBudget>(`/budgets/${month}`, dto);
    return data;
  },

  async addCategory(month: string, dto: AddCategoryDto): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const store = ensureBudgetStore(accountId);
      const budget = store[month] ?? normaliseMockBudget(accountId, month);
      budget.categories.push({ ...dto, id: `cat${_mockNextCatId++}` });
      store[month] = normaliseMockBudget(accountId, month, budget);
      return clone(store[month]);
    }
    const { data } = await httpClient.post<MonthBudget>(`/budgets/${month}/categories`, dto);
    return data;
  },

  async removeCategory(month: string, categoryId: string): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const store = ensureBudgetStore(accountId);
      const budget = store[month] ?? normaliseMockBudget(accountId, month);
      budget.categories = budget.categories.filter((category) => category.id !== categoryId);
      store[month] = normaliseMockBudget(accountId, month, budget);
      return clone(store[month]);
    }
    const { data } = await httpClient.delete<MonthBudget>(`/budgets/${month}/categories/${categoryId}`);
    return data;
  },

  async copyFrom(targetMonth: string, sourceMonth: string): Promise<MonthBudget> {
    if (config.useMock) {
      await delay();
      const accountId = mockAccountId();
      const store = ensureBudgetStore(accountId);
      const source = store[sourceMonth];
      if (!source) {
        throw { code: "SOURCE_BUDGET_NOT_FOUND", message: "Mês de origem não encontrado" };
      }
      const copy = normaliseMockBudget(accountId, targetMonth, {
        accountId,
        month: targetMonth,
        totalBudget: 0,
        categories: clone(source.categories),
        isReady: false,
      });
      store[targetMonth] = clone(copy);
      return clone(copy);
    }
    const { data } = await httpClient.post<MonthBudget>(`/budgets/${targetMonth}/copy-from/${sourceMonth}`);
    return data;
  },
};

export const statsApi = {
  async getSemester(endingMonth?: string): Promise<StatsSnapshot> {
    if (config.useMock) {
      await delay(350);
      void endingMonth;
      return getStatsSnapshot("semester");
    }
    const { data } = await httpClient.get<StatsSnapshot>("/stats/semester", {
      params: endingMonth ? { endingMonth } : undefined,
    });
    return data;
  },

  async getYear(year?: number): Promise<StatsSnapshot> {
    if (config.useMock) {
      await delay(350);
      void year;
      return getStatsSnapshot("year");
    }
    const { data } = await httpClient.get<StatsSnapshot>("/stats/year", {
      params: year ? { year } : undefined,
    });
    return data;
  },
};

export function resolveCategoryName(categoryId: string, categories?: BudgetCategory[]): string {
  if (categories) {
    const found = categories.find((category) => category.id === categoryId);
    if (found) return found.name;
  }
  return getCategoryName(categoryId);
}

export function resolveIncomeCategoryName(categoryId: string, categories?: IncomeCategory[]): string {
  if (categories) {
    const found = categories.find((category) => category.id === categoryId);
    if (found) return found.name;
  }
  return getIncomeCategoryName(categoryId, categories);
}
