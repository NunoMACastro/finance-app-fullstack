import { render, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  OverlayDescription,
  OverlayContent,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "./ui/responsive-overlay";

function mockViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("max-width") ? width < 768 : false,
      média: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}

describe("ResponsiveOverlay", () => {
  test("renders sheet on mobile", async () => {
    mockViewport(390);
    render(
      <ResponsiveOverlay open onOpenChange={() => {}}>
        <OverlayContent>
          <OverlayHeader>
            <OverlayTitle>Drawer Test</OverlayTitle>
            <OverlayDescription>Descricao Drawer</OverlayDescription>
          </OverlayHeader>
        </OverlayContent>
      </ResponsiveOverlay>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="sheet-content"]')).toBeInTheDocument();
    });
  });

  test("renders dialog on desktop", async () => {
    mockViewport(1024);
    render(
      <ResponsiveOverlay open onOpenChange={() => {}}>
        <OverlayContent>
          <OverlayHeader>
            <OverlayTitle>Dialog Test</OverlayTitle>
            <OverlayDescription>Descricao Dialog</OverlayDescription>
          </OverlayHeader>
        </OverlayContent>
      </ResponsiveOverlay>,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument();
    });
  });
});
