import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ConfirmActionDialog } from "./confirm-action-dialog";

describe("ConfirmActionDialog", () => {
  test("calls onConfirm only when clicking confirm", () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmActionDialog
        open
        onOpenChange={() => {}}
        title="Confirmar teste"
        description="Descricao de teste"
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
