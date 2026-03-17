import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const statsApiMocks = vi.hoisted(() => ({
  getSemester: vi.fn(),
  getYear: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

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

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
      {
        categoryId: "cat2",
        categoryName: "Lazer",
        budgeted: 400,
        actual: 390,
        difference: 10,
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
      {
        categoryId: "cat2",
        categoryName: "Lazer",
        monthly: [
          { month: "2026-01", budgeted: 130, actual: 110 },
          { month: "2026-02", budgeted: 130, actual: 140 },
          { month: "2026-03", budgeted: 140, actual: 140 },
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
    navigateMock.mockReset();
    statsApiMocks.getSemester.mockImplementation((_, forecastWindow: 3 | 6 = 3) =>
      Promise.resolve(buildSnapshot(forecastWindow)),
    );
    statsApiMocks.getYear.mockResolvedValue(buildSnapshot(3));
  });

  test("renders pulse and updates forecast window from 3M to 6M", async () => {
    const { container } = render(<StatsPage />);

    await screen.findByText("Pulse do período");
    expect(container.querySelector('[data-ui-v3-page="stats"]')).toBeInTheDocument();
    expect(screen.getByText("A mostrar dados da conta ativa")).toBeInTheDocument();

    expect(statsApiMocks.getSemester).toHaveBeenCalledWith(undefined, 3);
    expect(screen.getByText("Confiança alta: 3 meses de dados usados.")).toBeInTheDocument();

    const sixMonthButtons = screen.getAllByRole("button", { name: "6M" });
    fireEvent.click(sixMonthButtons[sixMonthButtons.length - 1]);

    await waitFor(() => {
      expect(statsApiMocks.getSemester).toHaveBeenLastCalledWith(undefined, 6);
    });

    expect(screen.getByText("Confiança média: dados limitados (3/6 meses).")).toBeInTheDocument();
  });

  test("opens and closes category insight sheet from drivers list", async () => {
    render(<StatsPage />);

    const driverRow = await screen.findByTestId("stats-driver-row-cat1");
    fireEvent.click(driverRow);
    expect(await screen.findByText("Detalhe · Despesas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => {
      expect(screen.queryByText("Detalhe · Despesas")).not.toBeInTheDocument();
    });
  });

  test("shows fetch error and allows retry", async () => {
    statsApiMocks.getSemester.mockRejectedValueOnce(new Error("Falha de rede"));
    statsApiMocks.getSemester.mockResolvedValueOnce(buildSnapshot(3));

    render(<StatsPage />);
    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Pulse do período")).toBeInTheDocument();
  });
});
