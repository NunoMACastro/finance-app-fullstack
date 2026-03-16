import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { CategoryExpensesSheet } from "./category-expenses-sheet";

const formatCurrency = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
const formatDate = (value: string) => value.slice(5);

describe("CategoryExpensesSheet", () => {
  test("abre em preview, mostra resumo/cta e permite remover manual", () => {
    const onOpenChange = vi.fn();
    const onDelete = vi.fn();
    const onViewAll = vi.fn();

    render(
      <CategoryExpensesSheet
        open
        onOpenChange={onOpenChange}
        categoryName="Despesas"
        transactions={[
          {
            id: "tx1",
            accountId: "acc",
            userId: "u1",
            month: "2026-03",
            date: "2026-03-01",
            type: "expense",
            origin: "manual",
            description: "Continente",
            amount: 120,
            categoryId: "c1",
            createdAt: "2026-03-01",
            updatedAt: "2026-03-01",
          },
        ]}
        canWriteFinancial
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onDeleteTransaction={onDelete}
        onViewAll={onViewAll}
      />,
    );

    expect(screen.getByText("Despesas · Despesas")).toBeInTheDocument();
    expect(screen.getByText("1 mov. · 120,00 € gasto")).toBeInTheDocument();
    expect(screen.getByText("Continente")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver todas" }));
    expect(onViewAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Remover lançamento" }));
    expect(onDelete).toHaveBeenCalledWith("tx1");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("mostra estado vazio quando categoria não tem despesas", () => {
    render(
      <CategoryExpensesSheet
        open
        onOpenChange={() => {}}
        categoryName="Lazer"
        transactions={[]}
        canWriteFinancial={false}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onDeleteTransaction={() => {}}
        onViewAll={() => {}}
      />,
    );

    expect(screen.getByText("Ainda sem despesas nesta categoria.")).toBeInTheDocument();
  });

  test("limita preview a 8 entradas", () => {
    const transactions = Array.from({ length: 10 }, (_, index) => ({
      id: `tx${index + 1}`,
      accountId: "acc",
      userId: "u1",
      month: "2026-03",
      date: `2026-03-${String(index + 1).padStart(2, "0")}`,
      type: "expense" as const,
      origin: "manual" as const,
      description: `Despesa ${index + 1}`,
      amount: 10,
      categoryId: "c1",
      createdAt: "2026-03-01",
      updatedAt: "2026-03-01",
    }));

    render(
      <CategoryExpensesSheet
        open
        onOpenChange={() => {}}
        categoryName="Despesas"
        transactions={transactions}
        canWriteFinancial={false}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        onDeleteTransaction={() => {}}
        onViewAll={() => {}}
      />,
    );

    expect(screen.getByText("10 mov. · 100,00 € gasto")).toBeInTheDocument();
    expect(screen.getByText("Despesa 8")).toBeInTheDocument();
    expect(screen.queryByText("Despesa 9")).not.toBeInTheDocument();
    expect(screen.queryByText("Despesa 10")).not.toBeInTheDocument();
  });
});
