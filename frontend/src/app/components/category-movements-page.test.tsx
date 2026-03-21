import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CategoryMovementsPage } from "./category-movements-page";

const apiMocks = vi.hoisted(() => ({
  listTransactions: vi.fn(),
  getBudget: vi.fn(),
  deleteTransaction: vi.fn(),
}));

const accountMocks = vi.hoisted(() => ({
  canWriteFinancial: true,
}));

vi.mock("../lib/api", () => ({
  transactionsApi: {
    list: apiMocks.listTransactions,
    delete: apiMocks.deleteTransaction,
  },
  budgetApi: {
    get: apiMocks.getBudget,
  },
}));

vi.mock("../lib/account-context", () => ({
  useAccount: () => ({
    activeAccountId: "acc1",
    canWriteFinancial: accountMocks.canWriteFinancial,
  }),
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CategoryMovementsPage", () => {
  beforeEach(() => {
    accountMocks.canWriteFinancial = true;
    apiMocks.deleteTransaction.mockResolvedValue(undefined);
  });

  test("renderiza lista completa e aplica filtros combinados", async () => {
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1000,
      categories: [{ id: "c1", name: "Despesas", percent: 100 }],
      isReady: true,
    });
    apiMocks.listTransactions.mockResolvedValue({
      totalCount: 2,
      totalAmount: 190,
      nextCursor: null,
      hasMore: false,
      items: [
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
        {
          id: "tx2",
          accountId: "acc1",
          userId: "u1",
          month: "2026-03",
          date: "2026-03-03",
          type: "expense",
          origin: "recurring",
          description: "Prestação",
          amount: 70,
          categoryId: "c1",
          createdAt: "2026-03-03T00:00:00.000Z",
          updatedAt: "2026-03-03T00:00:00.000Z",
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/month/2026-03/category/c1/movements"]}>
        <Routes>
          <Route path="/month/:month/category/:categoryId/movements" element={<CategoryMovementsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Despesas · Despesas")).toBeInTheDocument();
    expect(screen.getByText("2 mov. · 190,00 € gasto")).toBeInTheDocument();
    expect(screen.getByText("Continente")).toBeInTheDocument();
    expect(screen.getByText("Prestação")).toBeInTheDocument();
    expect(screen.getByText("2 resultados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abrir filtros avançados" }));
    expect(await screen.findByTestId("category-filters-sheet")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Pesquisar descrição"), {
      target: { value: "cont" },
    });
    fireEvent.change(screen.getByLabelText("Filtrar por origem"), {
      target: { value: "manual" },
    });
    fireEvent.change(screen.getByPlaceholderText("Valor mín."), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Ordenar movimentos"), {
      target: { value: "amount_desc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));

    expect(await screen.findByText("Continente")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Prestação")).not.toBeInTheDocument();
    });
    expect(screen.getByText("1 resultados de 2")).toBeInTheDocument();
  });

  test("mostra estado vazio para categoria sem movimentos", async () => {
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1000,
      categories: [{ id: "c1", name: "Despesas", percent: 100 }],
      isReady: true,
    });
    apiMocks.listTransactions.mockResolvedValue({
      totalCount: 0,
      totalAmount: 0,
      nextCursor: null,
      hasMore: false,
      items: [],
    });

    render(
      <MemoryRouter initialEntries={["/month/2026-03/category/c1/movements"]}>
        <Routes>
          <Route path="/month/:month/category/:categoryId/movements" element={<CategoryMovementsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ainda sem despesas nesta categoria.")).toBeInTheDocument();
  });

  test("mostra erro e permite retry", async () => {
    apiMocks.getBudget.mockRejectedValueOnce(new Error("falha"));
    apiMocks.listTransactions.mockRejectedValueOnce(new Error("falha"));
    apiMocks.getBudget.mockResolvedValueOnce({
      month: "2026-03",
      totalBudget: 1000,
      categories: [{ id: "c1", name: "Despesas", percent: 100 }],
      isReady: true,
    });
    apiMocks.listTransactions.mockResolvedValueOnce({
      totalCount: 0,
      totalAmount: 0,
      nextCursor: null,
      hasMore: false,
      items: [],
    });

    render(
      <MemoryRouter initialEntries={["/month/2026-03/category/c1/movements"]}>
        <Routes>
          <Route path="/month/:month/category/:categoryId/movements" element={<CategoryMovementsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("falha")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => {
      expect(apiMocks.listTransactions.mock.calls.length).toBeGreaterThan(1);
    });
    expect(await screen.findByText("Ainda sem despesas nesta categoria.")).toBeInTheDocument();
  });

  test("em viewer mode não mostra ação de remover", async () => {
    accountMocks.canWriteFinancial = false;
    apiMocks.getBudget.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1000,
      categories: [{ id: "c1", name: "Despesas", percent: 100 }],
      isReady: true,
    });
    apiMocks.listTransactions.mockResolvedValue({
      totalCount: 1,
      totalAmount: 120,
      nextCursor: null,
      hasMore: false,
      items: [
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
    });

    render(
      <MemoryRouter initialEntries={["/month/2026-03/category/c1/movements"]}>
        <Routes>
          <Route path="/month/:month/category/:categoryId/movements" element={<CategoryMovementsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Modo leitura: não tens permissão para remover lançamentos.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remover lançamento" })).not.toBeInTheDocument();
  });
});
