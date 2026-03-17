import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SegmentedControlV3 } from "./segmented-control-v3";

describe("SegmentedControlV3", () => {
  test("renders options and emits onChange when selecting another value", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControlV3
        value="semester"
        onChange={onChange}
        options={[
          { value: "semester", label: "6M" },
          { value: "year", label: "12M" },
        ]}
        ariaLabel="Selecionar período"
      />,
    );

    const group = screen.getByRole("group", { name: "Selecionar período" });
    expect(group).toHaveAttribute("data-ui-v3-segmented", "true");
    expect(screen.getByRole("button", { name: "6M" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "12M" }));
    expect(onChange).toHaveBeenCalledWith("year");
  });

  test("supports compact size variant", () => {
    render(
      <SegmentedControlV3
        value={3}
        onChange={() => {
          // no-op
        }}
        options={[
          { value: 3, label: "3M" },
          { value: 6, label: "6M" },
        ]}
        size="compact"
        ariaLabel="Selecionar janela"
      />,
    );

    expect(screen.getByRole("button", { name: "3M" })).toHaveClass("h-9");
    expect(screen.getByRole("button", { name: "6M" })).toHaveClass("h-9");
  });
});
