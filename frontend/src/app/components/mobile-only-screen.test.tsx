import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MobileOnlyScreen } from "./mobile-only-screen";

describe("MobileOnlyScreen", () => {
  test("renders desktop/tablet warning copy", () => {
    render(<MobileOnlyScreen />);
    expect(screen.getByText("App mobile apenas")).toBeInTheDocument();
    expect(screen.getByText(/foi otimizada para telemóvel/i)).toBeInTheDocument();
  });
});
