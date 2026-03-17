import { httpClient } from "./http-client";
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
  ExportUserData,
  InviteCodeResponse,
  IncomeCategory,
  MonthBudget,
  MonthSummary,
  RecurringRule,
  ReassignRecurringCategoryDto,
  ReassignRecurringCategoryResult,
  SaveBudgetDto,
  StatsSnapshot,
  ThemePalette,
  Transaction,
  UpdateRecurringRuleDto,
  UpdateTransactionDto,
  UserProfile,
  UserSession,
} from "./types";
import { assignCategoryColorSlots } from "./category-color-slot";
import { normalizeBudgetCategoriesKind } from "./category-kind";

function normalizeBudgetCategoriesForClient(categories: BudgetCategory[]): BudgetCategory[] {
  return assignCategoryColorSlots(normalizeBudgetCategoriesKind(categories));
}

function normalizeBudgetForClient(budget: MonthBudget): MonthBudget {
  return {
    ...budget,
    categories: normalizeBudgetCategoriesForClient(budget.categories),
  };
}

function normalizeTemplatesForClient(templates: BudgetTemplate[]): BudgetTemplate[] {
  return templates.map((template) => ({
    ...template,
    categories: normalizeBudgetCategoriesForClient(template.categories),
  }));
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const { data } = await httpClient.post<AuthResponse>("/auth/register", { name, email, password });
    return data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await httpClient.post("/auth/logout", { refreshToken });
  },

  async getMe(): Promise<UserProfile> {
    const { data } = await httpClient.get<UserProfile>("/auth/me");
    return data;
  },

  async completeTutorial(): Promise<UserProfile> {
    const { data } = await httpClient.post<UserProfile>("/auth/tutorial/complete", {});
    return data;
  },

  async resetTutorial(): Promise<UserProfile> {
    const { data } = await httpClient.post<UserProfile>("/auth/tutorial/reset", {});
    return data;
  },

  async updateProfile(payload: {
    name?: string;
    currency?: string;
    preferences?: {
      themePalette?: ThemePalette;
      hideAmountsByDefault?: boolean;
    };
  }): Promise<UserProfile> {
    const { data } = await httpClient.patch<UserProfile>("/auth/me/profile", payload);
    return data;
  },

  async updateEmail(currentPassword: string, newEmail: string): Promise<UserProfile> {
    const { data } = await httpClient.patch<UserProfile>("/auth/me/email", { currentPassword, newEmail });
    return data;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await httpClient.patch("/auth/me/password", { currentPassword, newPassword });
  },

  async listSessions(): Promise<UserSession[]> {
    const { data } = await httpClient.get<UserSession[]>("/auth/sessions");
    return data;
  },

  async revokeSession(jti: string): Promise<void> {
    await httpClient.delete(`/auth/sessions/${jti}`);
  },

  async revokeAllSessions(): Promise<void> {
    await httpClient.post("/auth/sessions/revoke-all", {});
  },

  async removeRevokedSessions(): Promise<void> {
    await httpClient.delete("/auth/sessions/revoked");
  },

  async exportData(): Promise<ExportUserData> {
    const { data } = await httpClient.get<ExportUserData>("/auth/export");
    return data;
  },

  async deleteMe(currentPassword: string): Promise<void> {
    await httpClient.delete("/auth/me", { data: { currentPassword } });
  },
};

export const accountsApi = {
  async list(): Promise<AccountSummary[]> {
    const { data } = await httpClient.get<AccountSummary[]>("/accounts");
    return data;
  },

  async create(name: string): Promise<AccountSummary> {
    const { data } = await httpClient.post<AccountSummary>("/accounts", { name });
    return data;
  },

  async joinByCode(code: string): Promise<AccountSummary> {
    const { data } = await httpClient.post<AccountSummary>("/accounts/join", { code });
    return data;
  },

  async generateInviteCode(accountId: string): Promise<InviteCodeResponse> {
    const { data } = await httpClient.post<InviteCodeResponse>(`/accounts/${accountId}/invite-codes`, {});
    return data;
  },

  async listMembers(accountId: string): Promise<AccountMember[]> {
    const { data } = await httpClient.get<AccountMember[]>(`/accounts/${accountId}/members`);
    return data;
  },

  async updateMemberRole(accountId: string, userId: string, role: AccountRole): Promise<AccountMember> {
    const { data } = await httpClient.patch<AccountMember>(`/accounts/${accountId}/members/${userId}/role`, { role });
    return data;
  },

  async removeMember(accountId: string, userId: string): Promise<void> {
    await httpClient.delete(`/accounts/${accountId}/members/${userId}`);
  },

  async leave(accountId: string): Promise<void> {
    await httpClient.post(`/accounts/${accountId}/leave`, {});
  },
};

export const incomeCategoriesApi = {
  async list(): Promise<IncomeCategory[]> {
    const { data } = await httpClient.get<IncomeCategory[]>("/income-categories");
    return data;
  },

  async create(name: string): Promise<IncomeCategory> {
    const { data } = await httpClient.post<IncomeCategory>("/income-categories", { name });
    return data;
  },

  async update(id: string, payload: { name?: string; active?: boolean }): Promise<IncomeCategory> {
    const { data } = await httpClient.patch<IncomeCategory>(`/income-categories/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/income-categories/${id}`);
  },
};

export const transactionsApi = {
  async getMonthSummary(month: string): Promise<MonthSummary> {
    const { data } = await httpClient.get<MonthSummary>("/transactions", { params: { month } });
    return data;
  },

  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const { data } = await httpClient.post<Transaction>("/transactions", dto);
    return data;
  },

  async update(id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const { data } = await httpClient.put<Transaction>(`/transactions/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/transactions/${id}`);
  },
};

export const recurringApi = {
  async list(): Promise<RecurringRule[]> {
    const { data } = await httpClient.get<RecurringRule[]>("/recurring-rules");
    return data;
  },

  async create(dto: CreateRecurringRuleDto): Promise<RecurringRule> {
    const { data } = await httpClient.post<RecurringRule>("/recurring-rules", dto);
    return data;
  },

  async update(id: string, dto: UpdateRecurringRuleDto): Promise<RecurringRule> {
    const { data } = await httpClient.put<RecurringRule>(`/recurring-rules/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/recurring-rules/${id}`);
  },

  async generate(month: string): Promise<{ created: number; fallbackCreated: number; processedRules: number }> {
    const { data } = await httpClient.post<{ created: number; fallbackCreated: number; processedRules: number }>(
      "/recurring-rules/generate",
      undefined,
      { params: { month } },
    );
    return data;
  },

  async reassignCategory(id: string, dto: ReassignRecurringCategoryDto): Promise<ReassignRecurringCategoryResult> {
    const { data } = await httpClient.post<ReassignRecurringCategoryResult>(
      `/recurring-rules/${id}/reassign-category`,
      dto,
    );
    return data;
  },
};

export const budgetApi = {
  async getTemplates(): Promise<BudgetTemplate[]> {
    const { data } = await httpClient.get<BudgetTemplate[]>("/budgets/templates");
    return normalizeTemplatesForClient(data);
  },

  async get(month: string): Promise<MonthBudget> {
    const { data } = await httpClient.get<MonthBudget>(`/budgets/${month}`);
    return normalizeBudgetForClient(data);
  },

  async save(month: string, dto: SaveBudgetDto): Promise<MonthBudget> {
    const { data } = await httpClient.put<MonthBudget>(`/budgets/${month}`, dto);
    return normalizeBudgetForClient(data);
  },

  async addCategory(month: string, dto: AddCategoryDto): Promise<MonthBudget> {
    const { data } = await httpClient.post<MonthBudget>(`/budgets/${month}/categories`, dto);
    return normalizeBudgetForClient(data);
  },

  async removeCategory(month: string, categoryId: string): Promise<MonthBudget> {
    const { data } = await httpClient.delete<MonthBudget>(`/budgets/${month}/categories/${categoryId}`);
    return normalizeBudgetForClient(data);
  },

  async copyFrom(targetMonth: string, sourceMonth: string): Promise<MonthBudget> {
    const { data } = await httpClient.post<MonthBudget>(`/budgets/${targetMonth}/copy-from/${sourceMonth}`);
    return normalizeBudgetForClient(data);
  },
};

export const statsApi = {
  async getSemester(
    endingMonth?: string,
    forecastWindow: 3 | 6 = 3,
    options?: { includeInsight?: boolean },
  ): Promise<StatsSnapshot> {
    const { data } = await httpClient.get<StatsSnapshot>("/stats/semester", {
      params: {
        ...(endingMonth ? { endingMonth } : {}),
        forecastWindow,
        ...(options?.includeInsight !== undefined
          ? { includeInsight: options.includeInsight }
          : {}),
      },
    });
    return data;
  },

  async getYear(
    year?: number,
    forecastWindow: 3 | 6 = 3,
    options?: { includeInsight?: boolean },
  ): Promise<StatsSnapshot> {
    const { data } = await httpClient.get<StatsSnapshot>("/stats/year", {
      params: {
        ...(year ? { year } : {}),
        forecastWindow,
        ...(options?.includeInsight !== undefined
          ? { includeInsight: options.includeInsight }
          : {}),
      },
    });
    return data;
  },
};

export function resolveCategoryName(categoryId: string, categories?: BudgetCategory[]): string {
  if (categories) {
    const found = categories.find((category) => category.id === categoryId);
    if (found) return found.name;
  }
  return categoryId;
}

export function resolveIncomeCategoryName(categoryId: string, categories?: IncomeCategory[]): string {
  if (categories) {
    const found = categories.find((category) => category.id === categoryId);
    if (found) return found.name;
  }
  return categoryId;
}
