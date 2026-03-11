import type {
  Transaction,
  RecurringRule,
  MonthBudget,
  MonthSummary,
  StatsSnapshot,
  UserProfile,
  TrendItem,
  BudgetVsActualItem,
  BudgetCategory,
} from "./types";

// Current month helper
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
export const PERSONAL_ACCOUNT_ID = "acc_personal_u1";

export const mockUser: UserProfile = {
  id: "u1",
  email: "joao@exemplo.pt",
  name: "Joao Silva",
  currency: "EUR",
  locale: "pt-PT",
  tutorialSeenAt: null,
  personalAccountId: PERSONAL_ACCOUNT_ID,
};

// Default budget categories
export const defaultCategories: BudgetCategory[] = [
  { id: "cat1", name: "Habitacao", percent: 32 },
  { id: "cat2", name: "Transportes", percent: 7 },
  { id: "cat3", name: "Alimentacao", percent: 14 },
  { id: "cat4", name: "Lazer", percent: 9 },
  { id: "cat5", name: "Saude", percent: 3 },
  { id: "cat6", name: "Investimento", percent: 17 },
  { id: "cat7", name: "Poupanca", percent: 11 },
  { id: "cat8", name: "Educacao", percent: 5 },
  { id: "cat9", name: "Outros", percent: 2 },
];

export const mockMonthBudget: MonthBudget = {
  accountId: PERSONAL_ACCOUNT_ID,
  month: currentMonth,
  totalBudget: 2200,
  categories: defaultCategories,
  isReady: true,
};

export const mockRecurringRules: RecurringRule[] = [
  {
    id: "rr1",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    type: "income",
    name: "Ordenado",
    amount: 2200,
    dayOfMonth: 1,
    categoryId: "cat1",
    startMonth: "2025-01",
    active: true,
  },
  {
    id: "rr2",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    type: "income",
    name: "Freelance",
    amount: 300,
    dayOfMonth: 15,
    categoryId: "cat8",
    startMonth: "2025-06",
    active: true,
  },
  {
    id: "rr3",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    type: "expense",
    name: "Renda",
    amount: 650,
    dayOfMonth: 1,
    categoryId: "cat1",
    startMonth: "2025-01",
    active: true,
  },
  {
    id: "rr4",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    type: "expense",
    name: "Ginasio",
    amount: 35,
    dayOfMonth: 5,
    categoryId: "cat4",
    startMonth: "2025-01",
    active: true,
  },
  {
    id: "rr5",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    type: "expense",
    name: "Seguro Auto",
    amount: 45,
    dayOfMonth: 10,
    categoryId: "cat2",
    startMonth: "2025-01",
    active: true,
  },
  {
    id: "rr6",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    type: "expense",
    name: "Netflix + Spotify",
    amount: 22,
    dayOfMonth: 8,
    categoryId: "cat4",
    startMonth: "2025-03",
    active: true,
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: "t1",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-01`,
    type: "income",
    origin: "recurring",
    recurringRuleId: "rr1",
    description: "Ordenado",
    amount: 2200,
    categoryId: "cat1",
    createdAt: `${currentMonth}-01T08:00:00Z`,
    updatedAt: `${currentMonth}-01T08:00:00Z`,
  },
  {
    id: "t2",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-15`,
    type: "income",
    origin: "recurring",
    recurringRuleId: "rr2",
    description: "Freelance",
    amount: 300,
    categoryId: "cat8",
    createdAt: `${currentMonth}-15T08:00:00Z`,
    updatedAt: `${currentMonth}-15T08:00:00Z`,
  },
  {
    id: "t3",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-01`,
    type: "expense",
    origin: "recurring",
    recurringRuleId: "rr3",
    description: "Renda",
    amount: 650,
    categoryId: "cat1",
    createdAt: `${currentMonth}-01T08:00:00Z`,
    updatedAt: `${currentMonth}-01T08:00:00Z`,
  },
  {
    id: "t4",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-05`,
    type: "expense",
    origin: "recurring",
    recurringRuleId: "rr4",
    description: "Ginasio",
    amount: 35,
    categoryId: "cat4",
    createdAt: `${currentMonth}-05T08:00:00Z`,
    updatedAt: `${currentMonth}-05T08:00:00Z`,
  },
  {
    id: "t5",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-10`,
    type: "expense",
    origin: "recurring",
    recurringRuleId: "rr5",
    description: "Seguro Auto",
    amount: 45,
    categoryId: "cat2",
    createdAt: `${currentMonth}-10T08:00:00Z`,
    updatedAt: `${currentMonth}-10T08:00:00Z`,
  },
  {
    id: "t6",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-08`,
    type: "expense",
    origin: "recurring",
    recurringRuleId: "rr6",
    description: "Netflix + Spotify",
    amount: 22,
    categoryId: "cat4",
    createdAt: `${currentMonth}-08T08:00:00Z`,
    updatedAt: `${currentMonth}-08T08:00:00Z`,
  },
  {
    id: "t7",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-03`,
    type: "expense",
    origin: "manual",
    description: "Supermercado Continente",
    amount: 87.5,
    categoryId: "cat3",
    createdAt: `${currentMonth}-03T12:00:00Z`,
    updatedAt: `${currentMonth}-03T12:00:00Z`,
  },
  {
    id: "t8",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-06`,
    type: "expense",
    origin: "manual",
    description: "Jantar com amigos",
    amount: 42,
    categoryId: "cat4",
    createdAt: `${currentMonth}-06T20:00:00Z`,
    updatedAt: `${currentMonth}-06T20:00:00Z`,
  },
  {
    id: "t9",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-12`,
    type: "expense",
    origin: "manual",
    description: "Combustivel",
    amount: 55,
    categoryId: "cat2",
    createdAt: `${currentMonth}-12T10:00:00Z`,
    updatedAt: `${currentMonth}-12T10:00:00Z`,
  },
  {
    id: "t10",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-14`,
    type: "expense",
    origin: "manual",
    description: "Curso Udemy",
    amount: 14.99,
    categoryId: "cat8",
    createdAt: `${currentMonth}-14T15:00:00Z`,
    updatedAt: `${currentMonth}-14T15:00:00Z`,
  },
  {
    id: "t11",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-02`,
    type: "expense",
    origin: "manual",
    description: "Investimento ETF",
    amount: 200,
    categoryId: "cat6",
    createdAt: `${currentMonth}-02T09:00:00Z`,
    updatedAt: `${currentMonth}-02T09:00:00Z`,
  },
  {
    id: "t12",
    accountId: PERSONAL_ACCOUNT_ID,
    userId: "u1",
    month: currentMonth,
    date: `${currentMonth}-02`,
    type: "expense",
    origin: "manual",
    description: "Poupanca Emergencia",
    amount: 150,
    categoryId: "cat7",
    createdAt: `${currentMonth}-02T09:00:00Z`,
    updatedAt: `${currentMonth}-02T09:00:00Z`,
  },
];

// Helper: get category name
export function getCategoryName(categoryId: string, categories?: BudgetCategory[]): string {
  const cats = categories ?? defaultCategories;
  return cats.find((c) => c.id === categoryId)?.name ?? categoryId;
}

// Stats helpers (deterministic - no random values)
const INCOME_FACTORS = [0.91, 0.96, 1.03, 0.98, 1.07, 1.01, 1.05, 0.94, 1.08, 1.02, 0.99, 1.06];
const EXPENSE_FACTORS = [0.67, 0.71, 0.69, 0.73, 0.75, 0.72, 0.7, 0.74, 0.76, 0.71, 0.69, 0.73];

function generateMonthData(monthKey: string, index: number, baseIncome: number) {
  const income = Math.round(baseIncome * INCOME_FACTORS[index % INCOME_FACTORS.length]);
  const expense = Math.round(income * EXPENSE_FACTORS[index % EXPENSE_FACTORS.length]);
  return { month: monthKey, income, expense, balance: income - expense };
}

export function getStatsSnapshot(type: "semester" | "year"): StatsSnapshot {
  const months = type === "semester" ? 6 : 12;
  const trend: TrendItem[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const data = generateMonthData(mk, months - i - 1, 2500);
    trend.push(data);
    totalIncome += data.income;
    totalExpense += data.expense;
  }

  const monthIncomeMap = new Map(trend.map((item) => [item.month, item.income]));
  const monthWeights = trend.map((item, idx) => item.expense + (idx + 1) * 50);
  const totalWeight = monthWeights.reduce((sum, value) => sum + value, 0);

  const budgetVsActual: BudgetVsActualItem[] = defaultCategories.map((c) => {
    const budgeted = trend.reduce(
      (sum, item) => sum + (c.percent / 100) * (monthIncomeMap.get(item.month) ?? 0),
      0,
    );
    const actual = trend.reduce((sum, item, monthIdx) => {
      const distribution = totalWeight > 0 ? monthWeights[monthIdx] / totalWeight : 0;
      const bias = 0.86 + ((monthIdx % 4) * 0.04) + ((c.percent % 7) * 0.003);
      return sum + budgeted * distribution * bias;
    }, 0);
    return {
      categoryId: c.id,
      categoryName: c.name,
      budgeted: Math.round(budgeted),
      actual: Math.round(actual),
      difference: Math.round(budgeted - actual),
    };
  });

  const categorySeries = budgetVsActual.map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    monthly: trend.map((item, monthIdx) => {
      const monthBudgeted = (defaultCategories.find((c) => c.id === category.categoryId)?.percent ?? 0)
        / 100
        * (monthIncomeMap.get(item.month) ?? 0);
      const distribution = totalWeight > 0 ? monthWeights[monthIdx] / totalWeight : 0;
      const bias = 0.86 + ((monthIdx % 4) * 0.04) + ((category.categoryId.length % 7) * 0.003);
      const monthActual = category.budgeted > 0 ? category.actual * distribution * bias : 0;
      return {
        month: item.month,
        budgeted: Math.round(monthBudgeted),
        actual: Math.round(monthActual),
      };
    }),
  }));

  const normalisedCategorySeries = categorySeries.map((series) => {
    const totalBudgetedSeries = series.monthly.reduce((sum, point) => sum + point.budgeted, 0);
    const totalActualSeries = series.monthly.reduce((sum, point) => sum + point.actual, 0);
    const target = budgetVsActual.find((item) => item.categoryId === series.categoryId);
    if (!target) return series;

    const budgetDelta = target.budgeted - totalBudgetedSeries;
    const actualDelta = target.actual - totalActualSeries;
    const lastIdx = series.monthly.length - 1;
    if (lastIdx >= 0) {
      series.monthly[lastIdx] = {
        ...series.monthly[lastIdx],
        budgeted: series.monthly[lastIdx].budgeted + budgetDelta,
        actual: series.monthly[lastIdx].actual + actualDelta,
      };
    }
    return series;
  });

  const last3 = trend.slice(-3);
  const avgIncome = Math.round(last3.reduce((s, t) => s + t.income, 0) / 3);
  const avgExpense = Math.round(last3.reduce((s, t) => s + t.expense, 0) / 3);

  return {
    periodType: type,
    periodKey: type === "semester"
      ? `${now.getFullYear()}-S${now.getMonth() < 6 ? 1 : 2}`
      : `${now.getFullYear()}`,
    totals: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    },
    trend,
    budgetVsActual,
    categorySeries: normalisedCategorySeries.map((series) => ({
      ...series,
      monthly: series.monthly.map((point) => ({
        month: point.month,
        budgeted: Math.max(0, point.budgeted),
        actual: Math.max(0, point.actual),
      })),
    })),
    forecast: {
      projectedIncome: avgIncome,
      projectedExpense: avgExpense,
      projectedBalance: avgIncome - avgExpense,
    },
  };
}
