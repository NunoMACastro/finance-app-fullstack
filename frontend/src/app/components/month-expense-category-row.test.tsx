import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MonthExpenseCategoryRow } from "./month-expense-category-row";

describe("MonthExpenseCategoryRow", () => {
  test("renderiza dados principais e abre detalhe ao clicar", () => {
    const onOpen = vi.fn();
    render(
      <MonthExpenseCategoryRow
        name="Despesas"
        percentLabel="65%"
        spentLabel="120,00 €"
        allocatedLabel="780,00 €"
        remainingLabel="660,00 €"
        movementsLabel="1 mov."
        progressPercent={15}
        tone="normal"
        dotClassName="bg-category-solid-1"
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText("Despesas")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText(/660,00 € restante/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Abrir detalhes de despesas da categoria Despesas/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
