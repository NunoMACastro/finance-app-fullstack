import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import {
  IconActionButtonV3,
  RowActionButtonV3,
  SelectableTileButtonV3,
  SeriesToggleButtonV3,
  TextActionButtonV3,
} from "./interaction-primitives-v3";

describe("interaction primitives v3", () => {
  test("IconActionButtonV3 triggers click and keeps icon size contract", () => {
    const onClick = vi.fn();
    render(
      <IconActionButtonV3 ariaLabel="Remover item" onClick={onClick} tone="danger">
        <span data-testid="icon">X</span>
      </IconActionButtonV3>,
    );

    const button = screen.getByRole("button", { name: "Remover item" });
    expect(button).toHaveClass("h-11", "w-11", "rounded-xl");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("TextActionButtonV3 renders link-like action", () => {
    const onClick = vi.fn();
    render(
      <TextActionButtonV3 onClick={onClick}>
        Gerir recorrências
      </TextActionButtonV3>,
    );

    const button = screen.getByRole("button", { name: "Gerir recorrências" });
    expect(button).toHaveClass("rounded-xl", "text-primary");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("RowActionButtonV3 supports dense variant", () => {
    const onClick = vi.fn();
    render(
      <RowActionButtonV3
        onClick={onClick}
        dense
        content={<span>Conta</span>}
        trailing={<span>&gt;</span>}
      />,
    );

    const button = screen.getByRole("button", { name: /Conta/ });
    expect(button).toHaveClass("min-h-9", "rounded-xl");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("SelectableTileButtonV3 reflects selected state", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SelectableTileButtonV3
        selected={false}
        onClick={onClick}
        title="Template Base"
        description="Linha de descrição"
      />,
    );

    let button = screen.getByRole("button", { name: /Template Base/ });
    expect(button).toHaveClass("border-border");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <SelectableTileButtonV3
        selected
        onClick={onClick}
        title="Template Base"
        description="Linha de descrição"
      />,
    );
    button = screen.getByRole("button", { name: /Template Base/ });
    expect(button).toHaveClass("border-primary/60");
  });

  test("SeriesToggleButtonV3 toggles visual tone", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SeriesToggleButtonV3 active={false} tone="success" onClick={onClick}>
        Receitas
      </SeriesToggleButtonV3>,
    );

    let button = screen.getByRole("button", { name: "Receitas" });
    expect(button).toHaveClass("bg-muted", "rounded-xl");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <SeriesToggleButtonV3 active tone="success" onClick={onClick}>
        Receitas
      </SeriesToggleButtonV3>,
    );
    button = screen.getByRole("button", { name: "Receitas" });
    expect(button).toHaveClass("bg-success-soft");
  });
});
