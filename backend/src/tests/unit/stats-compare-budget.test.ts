import { describe, expect, test } from "vitest";
import { compareBudget } from "../../modules/stats/service.js";

describe("compareBudget validation", () => {
  test("rejects inverted date ranges", async () => {
    await expect(compareBudget("account_1", "2026-03", "2026-02")).rejects.toMatchObject({
      code: "STATS_COMPARE_RANGE_INVALID",
    });
  });

  test("rejects ranges longer than 24 months", async () => {
    await expect(compareBudget("account_1", "2020-01", "2022-02")).rejects.toMatchObject({
      code: "STATS_COMPARE_RANGE_TOO_LARGE",
    });
  });
});
