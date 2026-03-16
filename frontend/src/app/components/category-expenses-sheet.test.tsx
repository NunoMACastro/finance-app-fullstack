import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { CategoryExpensesSheet } from "./category-expenses-sheet";

const formatCurrency = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;
const formatDate = (value: string) => value.slice(5);

describe("CategoryExpensesSheet", () => {
  test("abre, mostra transações e permite remover manual", () => {
    const onOpenChange = vi.fn();
    const onDelete = vi.fn();

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
      />,
    );

    expect(screen.getByText("Despesas · Despesas")).toBeInTheDocument();
    expect(screen.getByText("Continente")).toBeInTheDocument();

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
      />,
    );

    expect(screen.getByText("Ainda sem despesas nesta categoria.")).toBeInTheDocument();
  });
});
