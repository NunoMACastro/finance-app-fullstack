import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { OverflowActionsSheetV3 } from "./overflow-actions-sheet-v3";

describe("OverflowActionsSheetV3", () => {
  test("renders actions and triggers callbacks", () => {
    const onCreateShared = vi.fn();
    const onJoinByCode = vi.fn();
    const onOpenTutorial = vi.fn();
    const onOpenMembers = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <OverflowActionsSheetV3
        open
        onOpenChange={onOpenChange}
        onCreateShared={onCreateShared}
        onJoinByCode={onJoinByCode}
        onOpenTutorial={onOpenTutorial}
        onOpenMembers={onOpenMembers}
        canManageMembers
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Criar conta partilhada" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar por código" }));
    fireEvent.click(screen.getByRole("button", { name: "Gerir membros" }));
    fireEvent.click(screen.getByRole("button", { name: "Tutorial" }));

    expect(onCreateShared).toHaveBeenCalledTimes(1);
    expect(onJoinByCode).toHaveBeenCalledTimes(1);
    expect(onOpenMembers).toHaveBeenCalledTimes(1);
    expect(onOpenTutorial).toHaveBeenCalledTimes(1);
  });

  test("hides manage members action when not available", () => {
    render(
      <OverflowActionsSheetV3
        open
        onOpenChange={() => {}}
        onCreateShared={() => {}}
        onJoinByCode={() => {}}
        onOpenTutorial={() => {}}
        canManageMembers={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Gerir membros" })).not.toBeInTheDocument();
  });

  test("hides tutorial action when showTutorial is false", () => {
    render(
      <OverflowActionsSheetV3
        open
        onOpenChange={() => {}}
        onCreateShared={() => {}}
        onJoinByCode={() => {}}
        onOpenTutorial={() => {}}
        showTutorial={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Tutorial" })).not.toBeInTheDocument();
  });
});
