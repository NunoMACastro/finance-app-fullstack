import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { OverflowActionsSheetV3 } from "./overflow-actions-sheet-v3";

describe("OverflowActionsSheetV3", () => {
  test("opens overlay and executes selected action", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <OverflowActionsSheetV3
        title="Ações da regra"
        actions={[
          { id: "edit", label: "Editar", onSelect: onEdit },
          { id: "delete", label: "Remover", onSelect: onDelete, tone: "danger" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir mais ações" }));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
