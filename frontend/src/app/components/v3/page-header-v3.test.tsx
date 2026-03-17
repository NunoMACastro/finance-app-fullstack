import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PageHeaderV3 } from "./page-header-v3";

describe("PageHeaderV3", () => {
  test("renders title, subtitle, caption and slots", () => {
    render(
      <PageHeaderV3
        title="Estatísticas"
        subtitle="Últimos 6 meses"
        caption="Conta ativa"
        leading={<button type="button">Voltar</button>}
        trailing={<button type="button">Ação</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Estatísticas" })).toHaveClass("text-base");
    expect(screen.getByText("Últimos 6 meses")).toBeInTheDocument();
    expect(screen.getByText("Conta ativa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ação" })).toBeInTheDocument();
  });
});
