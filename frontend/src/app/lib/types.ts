// ═══════════════════════════════════════════════════════════
// Shared types — mirrors backend DTOs for seamless integration
// ═══════════════════════════════════════════════════════════

export type MonthKey = string; // YYYY-MM format

// ── Auth ──────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: UserProfile;
}

// ── User ──────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  currency: string;
  locale: string;
  tutorialSeenAt: string | null;
  personalAccountId: string;
}

// ── Budget ────────────────────────────────────────────────

/** Budget category — flat structure (one level) */
export interface BudgetCategory {
  id: string;
  name: string;
  percent: number; // percentage of totalBudget (0-100)
}

/** Monthly budget — each month has its own budget */
export interface MonthBudget {
  accountId: string;
  month: MonthKey;
  totalBudget: number; // total available money
  categories: BudgetCategory[];
  isReady: boolean;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  categories: BudgetCategory[];
}

export interface SaveBudgetDto {
  totalBudget: number;
  categories: BudgetCategory[];
}

export interface AddCategoryDto {
  name: string;
  percent: number;
}

// ── Transactions ──────────────────────────────────────────

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  month: MonthKey;
  date: string;
  type: "income" | "expense";
  origin: "manual" | "recurring";
  recurringRuleId?: string;
  description: string;
  amount: number;
  categoryId: string; // links to BudgetCategory.id
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionDto {
  month: MonthKey;
  date: string;
  type: "income" | "expense";
  origin: "manual" | "recurring";
  recurringRuleId?: string;
  description: string;
  amount: number;
  categoryId: string;
}

export interface UpdateTransactionDto {
  date?: string;
  description?: string;
  amount?: number;
  categoryId?: string;
  type?: "income" | "expense";
}

// ── Recurring Rules ───────────────────────────────────────

export interface RecurringRule {
  id: string;
  accountId: string;
  userId: string;
  type: "income" | "expense";
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: MonthKey;
  endMonth?: MonthKey;
  active: boolean;
}

export interface CreateRecurringRuleDto {
  type: "income" | "expense";
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string;
  startMonth: MonthKey;
  endMonth?: MonthKey;
}

export interface UpdateRecurringRuleDto {
  name?: string;
  amount?: number;
  dayOfMonth?: number;
  categoryId?: string;
  endMonth?: MonthKey;
  active?: boolean;
}

// ── Summaries / Stats ─────────────────────────────────────

export interface MonthSummary {
  month: MonthKey;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeTransactions: Transaction[];
  expenseTransactions: Transaction[];
}

export interface StatsTotals {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface TrendItem {
  month: MonthKey;
  income: number;
  expense: number;
  balance: number;
}

export interface BudgetVsActualItem {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  actual: number;
  difference: number;
}

export interface StatsSnapshot {
  periodType: "semester" | "year";
  periodKey: string;
  totals: StatsTotals;
  trend: TrendItem[];
  budgetVsActual: BudgetVsActualItem[];
  forecast: {
    projectedIncome: number;
    projectedExpense: number;
    projectedBalance: number;
  };
}

// ── Errors ────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// ── Generic wrappers ──────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ── Accounts / Workspaces ───────────────────────────────

export type AccountRole = "owner" | "editor" | "viewer";

export interface AccountSummary {
  id: string;
  name: string;
  type: "personal" | "shared";
  role: AccountRole;
  isPersonalDefault: boolean;
}

export interface InviteCodeResponse {
  code: string;
  expiresAt: string;
}

export interface AccountMember {
  userId: string;
  name: string;
  email: string;
  role: AccountRole;
  status: "active" | "inactive";
}
