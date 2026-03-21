import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  listRules: vi.fn(),
  getBudget: vi.fn(),
  listIncomeCategories: vi.fn(),
  reassignCategory: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  recurringApi: {
    list: apiMocks.listRules,
    generate: apiMocks.generate,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reassignCategory: apiMocks.reassignCategory,
  },
  budgetApi: {
    get: apiMocks.getBudget,
  },
  incomeCategoriesApi: {
    list: apiMocks.listIncomeCategories,
  },
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => ({
    activeAccountId: "a1",
    canWriteFinancial: true,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { RecurringRulesPage } from "./recurring-rules-page";

describe("RecurringRulesPage", () => {
  beforeEach(() => {
    apiMocks.listRules.mockResolvedValue([
      {
        id: "r1",
        accountId: "a1",
        userId: "u1",
        type: "expense",
        name: "Renda",
        amount: 500,
        dayOfMonth: 1,
        categoryId: "fallback_recurring_expense",
        startMonth: "2026-01",
        active: true,
        pendingFallbackCount: 1,
        lastGenerationStatus: "fallback",
      },
    ]);
    apiMocks.getBudget.mockResolvedValue({
      accountId: "a1",
      month: "2026-03",
      totalBudget: 0,
      isReady: false,
      categories: [
        { id: "cat_home", name: "Casa", percent: 100, kind: "expense" },
      ],
    });
    apiMocks.listIncomeCategories.mockResolvedValue([]);
    apiMocks.generate.mockResolvedValue({ created: 1, fallbackCreated: 0 });
    apiMocks.reassignCategory.mockResolvedValue({
      rule: {
        id: "r1",
        accountId: "a1",
        userId: "u1",
        type: "expense",
        name: "Renda",
        amount: 500,
        dayOfMonth: 1,
        categoryId: "cat_home",
        startMonth: "2026-01",
        active: true,
        pendingFallbackCount: 0,
        lastGenerationStatus: "ok",
      },
      migratedTransactions: 1,
    });
  });

  test("renders fallback state and allows category reassignment", async () => {
    render(
      <MemoryRouter initialEntries={["/recurring"]}>
        <Routes>
          <Route path="/recurring" element={<RecurringRulesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Renda")).toBeInTheDocument();
    expect(screen.getByText("1 fallback(s) pendente(s)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reatribuir categoria" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => {
      expect(apiMocks.reassignCategory).toHaveBeenCalledWith("r1", {
        categoryId: "cat_home",
        migratePastFallbackTransactions: false,
      });
    });
  });

  test("manual generation requires confirmation and uses updated copy", async () => {
    render(
      <MemoryRouter initialEntries={["/recurring"]}>
        <Routes>
          <Route path="/recurring" element={<RecurringRulesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const generateButton = await screen.findByRole("button", { name: "Gerar lançamentos deste mês" });
    expect(generateButton).toBeInTheDocument();

    fireEvent.click(generateButton);
    expect(await screen.findByText("Gerar lançamentos deste mês?")).toBeInTheDocument();
    expect(apiMocks.generate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gerar lançamentos" }));
    await waitFor(() => {
      expect(apiMocks.generate).toHaveBeenCalledTimes(1);
    });
  });
});
