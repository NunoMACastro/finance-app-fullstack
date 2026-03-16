import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MonthFinancialRuler } from "./month-financial-ruler";

describe("MonthFinancialRuler", () => {
  test("renderiza skeleton no estado loading", () => {
    render(<MonthFinancialRuler state="loading" />);
    expect(screen.getByLabelText("A carregar ritmo do mês")).toBeInTheDocument();
  });

  test("renderiza erro com retry", () => {
    const onRetry = vi.fn();
    render(
      <MonthFinancialRuler
        state="error"
        message="Falha ao carregar"
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("renderiza estado budget-not-ready com CTA quando pode editar", () => {
    render(
      <MonthFinancialRuler
        state="budget-not-ready"
        canWriteFinancial
        onEditBudget={() => {}}
      />,
    );

    expect(screen.getByText("Orçamento por definir")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar orçamento" })).toBeInTheDocument();
  });

  test("renderiza estado ready com resumo, valor principal e status", () => {
    render(
      <MonthFinancialRuler
        state="ready"
        progressPercent={60}
        tone="warning"
        dailyLabel="Disponível por dia"
        dailyValue="26,67 €/dia"
        macroLine="Gasto 720,00 € · Restante 480,00 € · 18 dias restantes"
        statusLine="Ritmo apertado"
        hint="Ainda sem atividade este mês"
      />,
    );

    expect(screen.getByText("26,67 €/dia")).toBeInTheDocument();
    expect(screen.getByText(/Gasto 720,00 €/)).toBeInTheDocument();
    expect(screen.getByText("Ritmo apertado")).toBeInTheDocument();
    expect(screen.getByText("Ainda sem atividade este mês")).toBeInTheDocument();
  });
});
