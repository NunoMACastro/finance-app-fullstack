import { describe, expect, test, vi } from "vitest";

vi.mock("../../models/budget.model.js", () => ({
  BudgetModel: {
    findOne: vi.fn(),
  },
}));

import { BudgetModel } from "../../models/budget.model.js";
import {
  RECURRING_EXPENSE_FALLBACK_CATEGORY_ID,
  copyBudgetFromMonth,
  removeCategory,
} from "../../modules/budgets/service.js";

describe("budget auxiliary rules", () => {
  test("rejects removal of the protected fallback category", async () => {
    await expect(
      removeCategory("account_1", "2026-03", RECURRING_EXPENSE_FALLBACK_CATEGORY_ID, "user_1"),
    ).rejects.toMatchObject({
      code: "BUDGET_CATEGORY_PROTECTED",
    });
  });

  test("rejects copying from a missing source month", async () => {
    vi.mocked(BudgetModel.findOne).mockResolvedValue(null);

    await expect(copyBudgetFromMonth("account_1", "2026-04", "2026-03", "user_1")).rejects.toMatchObject({
      code: "SOURCE_BUDGET_NOT_FOUND",
    });
  });
});
