import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import { BottomNavV3 } from "./bottom-nav-v3";

describe("BottomNavV3", () => {
  test("renderiza apenas Mês, Stats e Perfil", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNavV3 />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Mês" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Stats" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Perfil" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Partilhar" })).not.toBeInTheDocument();
  });
});

