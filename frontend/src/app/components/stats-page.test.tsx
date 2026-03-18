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

function buildSnapshot(
  windowMonths: 3 | 6,
  expenseActual = 2400,
  insightText?: string,
  overrides?: { totalsBreakdown?: { unallocated: number; unallocatedRate: number } },
) {
  const forecastConfidence = windowMonths === 3 ? "high" : "medium";
  const totalIncome = 6000;
  const savingsActual = 600;
  const leisureActual = 600;
  const consumptionActual = expenseActual + leisureActual;
  const totalExpense = consumptionActual + savingsActual;
  const unallocated = overrides?.totalsBreakdown?.unallocated ?? totalIncome - totalExpense;
  const unallocatedRate =
    overrides?.totalsBreakdown?.unallocatedRate ?? (totalIncome > 0 ? (unallocated / totalIncome) * 100 : 0);
  const potentialSavings = savingsActual + Math.max(unallocated, 0);

  return {
    periodType: "semester" as const,
    periodKey: "2026-S1",
    totals: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    },
    totalsBreakdown: {
      consumption: consumptionActual,
      savings: savingsActual,
      unallocated,
      potentialSavings,
      rates: {
        savings: totalIncome > 0 ? (savingsActual / totalIncome) * 100 : 0,
        unallocated: unallocatedRate,
        potentialSavings: totalIncome > 0 ? (potentialSavings / totalIncome) * 100 : 0,
      },
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
        categoryKind: "expense" as const,
        budgeted: 2600,
        actual: expenseActual,
        difference: 2600 - expenseActual,
      },
      {
        categoryId: "cat2",
        categoryName: "Lazer",
        categoryKind: "expense" as const,
        budgeted: 700,
        actual: leisureActual,
        difference: 700 - leisureActual,
      },
      {
        categoryId: "cat3",
        categoryName: "Poupanca",
        categoryKind: "reserve" as const,
        budgeted: 500,
        actual: savingsActual,
        difference: 500 - savingsActual,
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
          { month: "2026-01", budgeted: 220, actual: 190 },
          { month: "2026-02", budgeted: 230, actual: 200 },
          { month: "2026-03", budgeted: 250, actual: 210 },
        ],
      },
      {
        categoryId: "cat3",
        categoryName: "Poupanca",
        monthly: [
          { month: "2026-01", budgeted: 150, actual: 180 },
          { month: "2026-02", budgeted: 170, actual: 200 },
          { month: "2026-03", budgeted: 180, actual: 220 },
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
    ...(insightText
      ? {
          insight: {
            text: insightText,
            source: "ai" as const,
            generatedAt: "2026-03-17T11:00:00.000Z",
            model: "gpt-4.1-mini",
          },
        }
      : {}),
  };
}

describe("StatsPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    statsApiMocks.getSemester.mockImplementation((_, forecastWindow: 3 | 6 = 3, options?: { includeInsight?: boolean }) =>
      Promise.resolve(
        options?.includeInsight
          ? buildSnapshot(forecastWindow, 450, "As despesas de C1 subiram 12%. Ajusta o teto semanal.")
          : buildSnapshot(forecastWindow),
      ),
    );
    statsApiMocks.getYear.mockImplementation((_, forecastWindow: 3 | 6 = 3, options?: { includeInsight?: boolean }) =>
      Promise.resolve(buildSnapshot(forecastWindow)),
    );
  });

  test("renders pulse and updates forecast window from 3M to 6M", async () => {
    const { container } = render(<StatsPage />);

    await screen.findByText("Pulse do período");
    expect(container.querySelector('[data-ui-v3-page="stats"]')).toBeInTheDocument();
    expect(screen.getByText("A mostrar dados da conta ativa")).toBeInTheDocument();

    expect(statsApiMocks.getSemester).toHaveBeenCalledWith(undefined, 3, { includeInsight: false });
    expect(statsApiMocks.getSemester).toHaveBeenCalledWith(undefined, 3, { includeInsight: true });
    expect(screen.getByText("Confiança alta: 3 meses de dados usados.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Selecionar período" })).toHaveAttribute("data-ui-v3-segmented", "true");
    expect(screen.getByRole("group", { name: "Selecionar janela da projeção" })).toHaveAttribute("data-ui-v3-segmented", "true");

    const sixMonthButtons = screen.getAllByRole("button", { name: "6M" });
    fireEvent.click(sixMonthButtons[sixMonthButtons.length - 1]);

    await waitFor(() => {
      expect(statsApiMocks.getSemester).toHaveBeenCalledWith(undefined, 6, { includeInsight: false });
    });

    expect(screen.getByText("Consumo")).toBeInTheDocument();
    expect(screen.getByText("Poupanças")).toBeInTheDocument();
    expect(screen.getByText("Valor por alocar")).toBeInTheDocument();
    expect(screen.getByText("Aderência ao orçamento")).toBeInTheDocument();
    expect(screen.getByText("Taxa por alocar")).toBeInTheDocument();
    expect(screen.getByText("Poupança total potencial")).toBeInTheDocument();

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

  test("prefers backend insight text when available", async () => {
    statsApiMocks.getSemester
      .mockResolvedValueOnce(buildSnapshot(3))
      .mockResolvedValueOnce(
        buildSnapshot(3, 450, "As despesas de C1 subiram 12%. Ajusta o teto semanal para recuperar margem."),
      );

    render(<StatsPage />);
    expect(
      await screen.findByText(
        "As despesas de Despesas subiram 12%. Ajusta o teto semanal para recuperar margem.",
      ),
    ).toBeInTheDocument();
  });

  test("shows deficit labels when unallocated is negative", async () => {
    statsApiMocks.getSemester
      .mockResolvedValueOnce(buildSnapshot(3, 5000, undefined, { totalsBreakdown: { unallocated: -200, unallocatedRate: -3.33 } }))
      .mockResolvedValueOnce(buildSnapshot(3, 5000, undefined, { totalsBreakdown: { unallocated: -200, unallocatedRate: -3.33 } }));

    render(<StatsPage />);

    expect(await screen.findByText("Valor em falta")).toBeInTheDocument();
    expect(screen.getByText("Taxa em falta")).toBeInTheDocument();
  });
});
