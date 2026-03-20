import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MonthPage } from "./month-page";

const apiMocks = vi.hoisted(() => ({
  getMonthSummary: vi.fn(),
  getBudget: vi.fn(),
  getIncomeCategories: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  transactionsApi: {
    getMonthSummary: apiMocks.getMonthSummary,
    delete: vi.fn(),
    create: vi.fn(),
  },
  budgetApi: {
    get: apiMocks.getBudget,
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
  }),
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => ({
    activeAccountId: "acc1",
    activeAccountRole: "owner",
    canWriteFinancial: true,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("MonthPage financial ruler states", () => {
  beforeEach(() => {
    apiMocks.getIncomeCategories.mockResolvedValue([]);
  });

  test("mostra estado de orçamento por definir quando budget nao esta pronto", async () => {
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

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Orçamento por definir")).toBeInTheDocument();
  });

  test("mostra estado humano quando mes esta sem atividade", async () => {
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
      categories: [{ id: "c1", name: "Casa", percent: 100 }],
      isReady: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/À espera de movimentos/)).toBeInTheDocument();
    expect(screen.getByText("Ainda sem atividade este mês")).toBeInTheDocument();
  });

  test("mostra estado acima do orçamento com valor diario protegido", async () => {
    apiMocks.getMonthSummary.mockResolvedValue({
      month: "2026-03",
      totalIncome: 100,
      totalExpense: 400,
      balance: -300,
      expenseTransactions: [{ id: "tx1", amount: 400, categoryId: "c1", date: "2026-03-01", description: "Teste", origin: "manual" }],
      incomeTransactions: [{ id: "tx2", amount: 100, categoryId: "salary", date: "2026-03-01", description: "Salário", origin: "manual" }],
    });
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 300,
      categories: [{ id: "c1", name: "Casa", percent: 100 }],
      isReady: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Acima do orçamento/)).toBeInTheDocument();
    expect(screen.getByText(/0,00.*\/dia/)).toBeInTheDocument();
  });

  test("abre detalhe da categoria em sheet e mostra receitas em bloco separado", async () => {
    apiMocks.getMonthSummary.mockResolvedValue({
      month: "2026-03",
      totalIncome: 1200,
      totalExpense: 120,
      balance: 1080,
      expenseTransactions: [
        {
          id: "tx1",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-01",
          type: "expense",
          origin: "manual",
          description: "Continente",
          amount: 120,
          categoryId: "c1",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      incomeTransactions: [
        {
          id: "tx2",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-01",
          type: "income",
          origin: "manual",
          description: "Salário",
          amount: 1200,
          categoryId: "salary",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
    });
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1200,
      categories: [{ id: "c1", name: "Casa", percent: 100 }],
      isReady: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Abrir detalhes de despesas da categoria Casa/ }));
    expect(await screen.findByText("Despesas · Casa")).toBeInTheDocument();
    expect(screen.getByText("Receitas")).toBeInTheDocument();
  });

  test("navega para ecrã completo ao clicar em Ver todas no sheet", async () => {
    apiMocks.getMonthSummary.mockResolvedValue({
      month: "2026-03",
      totalIncome: 1200,
      totalExpense: 120,
      balance: 1080,
      expenseTransactions: [
        {
          id: "tx1",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-01",
          type: "expense",
          origin: "manual",
          description: "Continente",
          amount: 120,
          categoryId: "c1",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      incomeTransactions: [],
    });
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1200,
      categories: [{ id: "c1", name: "Casa", percent: 100 }],
      isReady: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
          <Route path="/month/:month/category/:categoryId/movements" element={<div>Detalhe categoria</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Abrir detalhes de despesas da categoria Casa/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Ver todas" }));
    expect(await screen.findByText("Detalhe categoria")).toBeInTheDocument();
  });

  test("ordena categorias com expense primeiro e reserve no fim", async () => {
    apiMocks.getMonthSummary.mockResolvedValue({
      month: "2026-03",
      totalIncome: 1000,
      totalExpense: 330,
      balance: 670,
      expenseTransactions: [
        {
          id: "tx_invest",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-01",
          type: "expense",
          origin: "manual",
          description: "Transferência investimento",
          amount: 200,
          categoryId: "c_invest",
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          id: "tx_desp",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-02",
          type: "expense",
          origin: "manual",
          description: "Supermercado",
          amount: 120,
          categoryId: "c_desp",
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-02T00:00:00.000Z",
        },
        {
          id: "tx_lazer",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-03",
          type: "expense",
          origin: "manual",
          description: "Cinema",
          amount: 10,
          categoryId: "c_lazer",
          createdAt: "2026-03-03T00:00:00.000Z",
          updatedAt: "2026-03-03T00:00:00.000Z",
        },
      ],
      incomeTransactions: [],
    });
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1000,
      categories: [
        { id: "c_invest", name: "Investimento", percent: 20, kind: "reserve" },
        { id: "c_desp", name: "Despesas", percent: 40, kind: "expense" },
        { id: "c_poup", name: "Poupança", percent: 20, kind: "reserve" },
        { id: "c_lazer", name: "Lazer", percent: 20, kind: "expense" },
      ],
      isReady: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole("button", { name: /Abrir detalhes de despesas da categoria/i });
    const labels = rows.map((row) => row.getAttribute("aria-label") ?? "");

    expect(labels[0]).toContain("Despesas");
    expect(labels[1]).toContain("Lazer");
    expect(labels[2]).toContain("Investimento");
    expect(labels[3]).toContain("Poupança");
  });

  test("month picker includes explicit cancel button and closes without changing month", async () => {
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

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const monthButton = await screen.findByRole("button", { name: "Selecionar mês do orçamento" });
    const monthLabelBefore = monthButton.textContent;
    fireEvent.click(monthButton);

    expect(await screen.findByRole("heading", { name: "Escolher mês" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await screen.findByRole("button", { name: "Selecionar mês do orçamento" });
    expect(screen.queryByRole("heading", { name: "Escolher mês" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar mês do orçamento" }).textContent).toBe(monthLabelBefore);
  });

  test("month picker list is scrollable", async () => {
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

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<MonthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Selecionar mês do orçamento" }));
    const monthOptionsList = await screen.findByTestId("month-picker-options");
    expect(monthOptionsList).toHaveClass("max-h-[12.25rem]");
    expect(monthOptionsList).toHaveClass("overflow-y-auto");
  });
});
