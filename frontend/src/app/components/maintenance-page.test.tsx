import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { config } from "../lib/config";
import { MaintenancePage } from "./maintenance-page";

describe("MaintenancePage", () => {
  test("renders maintenance title and message", () => {
    render(<MaintenancePage />);

    expect(screen.getByRole("heading", { name: config.maintenanceTitle })).toBeInTheDocument();
    expect(screen.getByText(config.maintenanceMessage)).toBeInTheDocument();
  });
});
