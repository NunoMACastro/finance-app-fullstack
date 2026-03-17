import { describe, expect, test } from "vitest";
import { shouldGenerateRuleForMonth } from "../../modules/recurring/service.js";

describe("recurring due-date generation", () => {
  const activeRule = {
    dayOfMonth: 31,
    active: true,
    startMonth: "2026-01",
    endMonth: null,
  };

  test("generates all active rules for past months", () => {
    const asOfDate = new Date("2026-03-10T12:00:00.000Z");
    expect(shouldGenerateRuleForMonth(activeRule, "2026-02", asOfDate)).toBe(true);
  });

  test("does not generate for future months", () => {
    const asOfDate = new Date("2026-03-10T12:00:00.000Z");
    expect(shouldGenerateRuleForMonth(activeRule, "2026-04", asOfDate)).toBe(false);
  });

  test("respects clamped due day on short months", () => {
    const beforeDueDate = new Date("2026-02-27T12:00:00.000Z");
    const atDueDate = new Date("2026-02-28T12:00:00.000Z");

    expect(shouldGenerateRuleForMonth(activeRule, "2026-02", beforeDueDate)).toBe(false);
    expect(shouldGenerateRuleForMonth(activeRule, "2026-02", atDueDate)).toBe(true);
  });

  test("ignores inactive rules", () => {
    const asOfDate = new Date("2026-03-10T12:00:00.000Z");
    expect(
      shouldGenerateRuleForMonth(
        {
          ...activeRule,
          active: false,
        },
        "2026-03",
        asOfDate,
      ),
    ).toBe(false);
  });
});
