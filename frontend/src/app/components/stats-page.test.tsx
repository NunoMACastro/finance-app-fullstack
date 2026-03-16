import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const statsApiMocks = vi.hoisted(() => ({
  getSemester: vi.fn(),
  getYear: vi.fn(),
}));

vi.mock("../lib/auth-context", () => ({
  useAuth: () => ({
    user: { currency: "EUR" },
    isAmountsHidden: false,
  }),
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => ({
    activeAccountId: "acc_test",
  }),
}));

vi.mock("../lib/api", () => ({
  statsApi: {
    getSemester: statsApiMocks.getSemester,
    getYear: statsApiMocks.getYear,
  },
}));

import { StatsPage } from "./stats-page";

function buildSnapshot(windowMonths: 3 | 6, expenseActual = 450) {
  const forecastConfidence = windowMonths === 3 ? "high" : "medium";
  return {
    periodType: "semester" as const,
    periodKey: "2026-S1",
    totals: {
      totalIncome: 6000,
      totalExpense: 3600,
      balance: 2400,
    },
    trend: [
      { month: "2026-01", income: 1800, expense: 1200, balance: 600 },
      { month: "2026-02", income: 2000, expense: 1100, balance: 900 },
      { month: "2026-03", income: 2200, expense: 1300, balance: 900 },
    ],
    budgetVsActual: [
      {
        categoryId: "cat1",
        categoryName: "Despesas",
        budgeted: 1200,
        actual: expenseActual,
        difference: 1200 - expenseActual,
      },
    ],
    categorySeries: [
      {
        categoryId: "cat1",
        categoryName: "Despesas",
        monthly: [
          { month: "2026-01", budgeted: 400, actual: Math.round(expenseActual / 3) },
          { month: "2026-02", budgeted: 400, actual: Math.round(expenseActual / 3) },
          { month: "2026-03", budgeted: 400, actual: Math.round(expenseActual / 3) },
        ],
      },
    ],
    incomeByCategory: [
      {
        categoryId: "inc1",
        categoryName: "Salario",
        amount: 6000,
        percent: 100,
      },
    ],
    incomeCategorySeries: [
      {
        categoryId: "inc1",
        categoryName: "Salario",
        monthly: [
          { month: "2026-01", amount: 1800 },
          { month: "2026-02", amount: 2000 },
          { month: "2026-03", amount: 2200 },
        ],
      },
    ],
    forecast: {
      projectedIncome: 2000,
      projectedExpense: 1200,
      projectedBalance: 800,
      windowMonths,
      sampleSize: 3,
      confidence: forecastConfidence,
    },
  };
}

describe("StatsPage", () => {
  beforeEach(() => {
    statsApiMocks.getSemester.mockImplementation((_, forecastWindow: 3 | 6 = 3) =>
      Promise.resolve(buildSnapshot(forecastWindow)),
    );
    statsApiMocks.getYear.mockResolvedValue(buildSnapshot(3));
  });

  test("updates forecast window from 3M to 6M and shows confidence note", async () => {
    const { container } = render(<StatsPage />);

    await screen.findByText("Projeção Próximo Mês");
    expect(container.querySelector('[data-ui-v3-page="stats"]')).toBeInTheDocument();

    expect(statsApiMocks.getSemester).toHaveBeenCalledWith(undefined, 3);
    expect(screen.getByText("Confiança alta: 3 meses de dados usados.")).toBeInTheDocument();

    const sixMonthButtons = screen.getAllByRole("button", { name: "6M" });
    fireEvent.click(sixMonthButtons[sixMonthButtons.length - 1]);

    await waitFor(() => {
      expect(statsApiMocks.getSemester).toHaveBeenLastCalledWith(undefined, 6);
    });

    expect(screen.getByText("Confiança média: dados limitados (3/6 meses).")).toBeInTheDocument();
  });

  test("shows explicit donut empty state when expenses are zero", async () => {
    statsApiMocks.getSemester.mockResolvedValue(buildSnapshot(3, 0));

    render(<StatsPage />);

    await screen.findByText("Ainda sem despesas neste período.");
    expect(
      screen.getByText("Quando adicionares lançamentos, verás aqui a distribuição por categoria."),
    ).toBeInTheDocument();
  });
});
