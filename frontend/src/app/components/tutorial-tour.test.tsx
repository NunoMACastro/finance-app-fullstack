import { beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TutorialTour } from "./tutorial-tour";

function createTourTarget(id: string) {
  const node = document.createElement("div");
  node.setAttribute("data-tour", id);
  node.textContent = id;
  document.body.appendChild(node);
}

describe("TutorialTour", () => {
  beforeEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () =>
        ({
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 120,
          bottom: 44,
          width: 120,
          height: 44,
          toJSON: () => ({}),
        }) as DOMRect,
    );
  });

  test("omite passos sem target no estado atual (month)", async () => {
    const availableTargets = [
      "header-icon-actions",
      "header-visibility-toggle",
      "header-help",
      "header-logout",
      "bottom-profile-nav",
      "month-budget-select",
      "month-budget-button",
      "month-view-tabs",
      // intentionally missing:
      // - month-add-transaction
      // - month-categories
    ];
    availableTargets.forEach(createTourTarget);

    render(
      <TutorialTour
        open
        scope="month"
        showAccountSelectStep={false}
        onClose={() => {}}
      />,
    );

    expect(await screen.findByText("Passo 1 de 8")).toBeInTheDocument();
    expect(screen.queryByText("Novo lançamento")).not.toBeInTheDocument();
    expect(screen.queryByText("Categorias do orçamento")).not.toBeInTheDocument();
  });
});

