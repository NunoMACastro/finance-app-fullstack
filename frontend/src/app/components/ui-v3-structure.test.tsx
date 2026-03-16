import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getMonthSummary: vi.fn(),
  getBudget: vi.fn(),
  getIncomeCategories: vi.fn(),
  getTemplates: vi.fn(),
  saveBudget: vi.fn(),
}));

const themeMocks = vi.hoisted(() => ({
  setTheme: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/api", () => ({
  transactionsApi: {
    getMonthSummary: apiMocks.getMonthSummary,
  },
  budgetApi: {
    get: apiMocks.getBudget,
    getTemplates: apiMocks.getTemplates,
    save: apiMocks.saveBudget,
  },
  incomeCategoriesApi: {
    list: apiMocks.getIncomeCategories,
  },
  resolveIncomeCategoryName: () => "Salário",
}));

vi.mock("../lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      name: "Nuno",
      email: "nuno@example.com",
      currency: "EUR",
      tutorialSeenAt: "2026-01-01T00:00:00.000Z",
      preferences: { hideAmountsByDefault: false },
    },
    isAmountsHidden: false,
    updateProfile: vi.fn().mockResolvedValue(undefined),
    updateEmail: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    listSessions: vi.fn().mockResolvedValue([]),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessions: vi.fn().mockResolvedValue(undefined),
    removeRevokedSessions: vi.fn().mockResolvedValue(undefined),
    resetTutorial: vi.fn().mockResolvedValue(undefined),
    exportData: vi.fn().mockResolvedValue({}),
    deleteMe: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => ({
    accounts: [{ id: "acc1", name: "Pessoal", type: "personal", role: "owner" }],
    activeAccount: { id: "acc1", name: "Pessoal", type: "personal", role: "owner" },
    activeAccountId: "acc1",
    activeAccountRole: "owner",
    canWriteFinancial: true,
    setActiveAccount: vi.fn(),
    createSharedAccount: vi.fn().mockResolvedValue(undefined),
    joinByCode: vi.fn().mockResolvedValue(undefined),
    generateInviteCode: vi.fn().mockResolvedValue({ code: "ABC123" }),
    listMembers: vi.fn().mockResolvedValue([]),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    leaveAccount: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../lib/theme-preferences", () => ({
  useThemePreferences: () => ({
    theme: "brisa",
    setTheme: themeMocks.setTheme,
    isSaving: false,
  }),
}));

import { MonthPage } from "./month-page";
import { BudgetEditorPage } from "./budget-editor-page";
import { ProfilePage } from "./profile-page";

describe("UI v3 structure smoke", () => {
  beforeEach(() => {
    themeMocks.setTheme.mockClear();
    apiMocks.getMonthSummary.mockResolvedValue({
      month: "2026-03",
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expenseTransactions: [],
      incomeTransactions: [],
    });
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 0,
      categories: [],
      isReady: false,
    });
    apiMocks.getIncomeCategories.mockResolvedValue([]);
    apiMocks.getTemplates.mockResolvedValue([]);
    apiMocks.saveBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 0,
      categories: [],
      isReady: false,
    });
  });

  test("month page exposes v3 root", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector('[data-ui-v3-page="month"]')).toBeInTheDocument();
    expect(await screen.findByText("Sem categorias de despesas neste mês")).toBeInTheDocument();
  });

  test("budget editor page exposes v3 root", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/budget/2026-03/edit"]}>
        <Routes>
          <Route path="/budget/:month/edit" element={<BudgetEditorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector('[data-ui-v3-page="budget-editor"]')).toBeInTheDocument();
    expect(await screen.findByText("Orçamento Total (EUR)")).toBeInTheDocument();
  });

  test("profile page exposes v3 root", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector('[data-ui-v3-page="profile"]')).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Conta" })).toBeInTheDocument();
    expect(screen.getByText("Tema")).toBeInTheDocument();
  });

  test("profile page changes theme via theme selector", () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    const brisaOption = screen.getByRole("option", { name: "Brisa" });
    const themeSelect = brisaOption.closest("select");
    expect(themeSelect).not.toBeNull();

    fireEvent.change(themeSelect as HTMLSelectElement, { target: { value: "terra" } });
    expect(themeMocks.setTheme).toHaveBeenCalledWith("terra");
  });
});
