import { describe, expect, test } from "vitest";
import { monthFromDate, monthToDate } from "../../lib/month.js";

describe("month utilities in UTC", () => {
  test("monthFromDate uses UTC boundary (westward shift)", () => {
    const date = new Date("2026-03-01T00:30:00+01:00");
    expect(monthFromDate(date)).toBe("2026-02");
  });

  test("monthFromDate uses UTC boundary (eastward shift)", () => {
    const date = new Date("2026-02-28T23:30:00-02:00");
    expect(monthFromDate(date)).toBe("2026-03");
  });

  test("monthToDate clamps using real month length", () => {
    const feb = monthToDate("2026-02", 31);
    expect(feb.toISOString().slice(0, 10)).toBe("2026-02-28");

    const jan = monthToDate("2026-01", 31);
    expect(jan.toISOString().slice(0, 10)).toBe("2026-01-31");
  });
});
