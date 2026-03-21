import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MemoryRouter } from "react-router";
import { RouteErrorPage } from "./route-error-page";

describe("RouteErrorPage", () => {
  test("renders the generic 500 fallback", () => {
    render(
      <MemoryRouter>
        <RouteErrorPage error={new Error("boom")} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Encontrámos um erro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar ao início" })).toBeInTheDocument();
  });
});
