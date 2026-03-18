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
  preferences: UserPreferences;
  tutorialSeenAt: string | null;
  personalAccountId: string;
}

export type ThemePalette = "brisa" | "calma" | "aurora" | "terra";

export interface UserPreferences {
  themePalette: ThemePalette;
  hideAmountsByDefault: boolean;
}

export interface UserSession {
  jti: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface ExportUserData {
  exportedAt: string;
  user: UserProfile;
  personalAccount: {
    accountId: string;
    budgets: unknown[];
    transactions: unknown[];
    recurringRules: unknown[];
    incomeCategories: unknown[];
    statsSnapshots: unknown[];
  };
  sharedMemberships: Array<{
    accountId: string;
    accountName: string;
    accountType: "personal" | "shared";
    role: AccountRole;
    status: "active" | "inactive";
  }>;
}

// ── Budget ────────────────────────────────────────────────

/** Budget category — flat structure (one level) */
export type BudgetCategoryKind = "expense" | "reserve";

export interface BudgetCategory {
  id: string;
  name: string;
  percent: number; // percentage of totalBudget (0-100)
  colorSlot?: number; // theme slot (1-9)
  kind?: BudgetCategoryKind;
}

export interface IncomeCategory {
  id: string;
  accountId: string;
  name: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
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
  kind?: BudgetCategoryKind;
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
  categoryResolution?: "direct" | "fallback";
  requestedCategoryId?: string;
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
  lastGenerationAt?: string;
  lastGenerationStatus?: "ok" | "fallback";
  pendingFallbackCount?: number;
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

export interface ReassignRecurringCategoryDto {
  categoryId: string;
  migratePastFallbackTransactions: boolean;
}

export interface ReassignRecurringCategoryResult {
  rule: RecurringRule;
  migratedTransactions: number;
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
  categoryKind?: "expense" | "reserve";
  budgeted: number;
  actual: number;
  difference: number;
}

export interface CategorySeriesMonthlyItem {
  month: MonthKey;
  budgeted: number;
  actual: number;
}

export interface CategorySeriesItem {
  categoryId: string;
  categoryName: string;
  categoryKind?: "expense" | "reserve";
  monthly: CategorySeriesMonthlyItem[];
}

export interface IncomeByCategoryItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
}

export interface IncomeCategorySeriesMonthlyItem {
  month: MonthKey;
  amount: number;
}

export interface IncomeCategorySeriesItem {
  categoryId: string;
  categoryName: string;
  monthly: IncomeCategorySeriesMonthlyItem[];
}

export interface StatsSnapshot {
  periodType: "semester" | "year";
  periodKey: string;
  totals: StatsTotals;
  totalsBreakdown?: {
    consumption: number;
    savings: number;
    unallocated: number;
    potentialSavings: number;
    rates: {
      savings: number;
      unallocated: number;
      potentialSavings: number;
    };
  };
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
  insight?: {
    text: string;
    source: "ai";
    generatedAt: string;
    model: string;
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
