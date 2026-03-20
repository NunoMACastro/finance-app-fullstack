import { describe, expect, test } from "vitest";
import request from "supertest";
import { getIntegrationApp } from "./harness.js";

const RECURRING_EXPENSE_FALLBACK_CATEGORY_ID = "fallback_recurring_expense";

function monthKeyFromOffset(offset: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

describe("recurring fallback integration", () => {
  test("expense fallback creates protected budget category and supports reassign migration", async () => {
    const month = monthKeyFromOffset(-1);

    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Maria",
      email: "maria.recurring@example.com",
      password: "StrongPass1!",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.accessToken as string;
    const personalAccountId = registerRes.body.user.personalAccountId as string;

    const budgetRes = await request(getIntegrationApp())
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send({
        totalBudget: 0,
        categories: [{ id: "cat_casa", name: "Casa", percent: 100 }],
      });

    expect(budgetRes.status).toBe(200);

    const createRuleRes = await request(getIntegrationApp())
      .post("/api/v1/recurring-rules")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send({
        type: "expense",
        name: "Renda",
        amount: 500,
        dayOfMonth: 1,
        categoryId: "cat_inexistente",
        startMonth: month,
      });

    expect(createRuleRes.status).toBe(201);
    const ruleId = createRuleRes.body.id as string;

    const generateRes = await request(getIntegrationApp())
      .post(`/api/v1/recurring-rules/generate?month=${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send();

    expect(generateRes.status).toBe(200);
    expect(generateRes.body.created).toBe(1);
    expect(generateRes.body.fallbackCreated).toBe(1);

    const budgetAfterGenerateRes = await request(getIntegrationApp())
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId);

    expect(budgetAfterGenerateRes.status).toBe(200);
    expect(
      budgetAfterGenerateRes.body.categories.some(
        (category: { id: string; name: string }) =>
          category.id === RECURRING_EXPENSE_FALLBACK_CATEGORY_ID && category.name === "Sem categoria (recorrente)",
      ),
    ).toBe(true);

    const summaryRes = await request(getIntegrationApp())
      .get(`/api/v1/transactions?month=${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.expenseTransactions).toHaveLength(1);
    expect(summaryRes.body.expenseTransactions[0].categoryId).toBe(RECURRING_EXPENSE_FALLBACK_CATEGORY_ID);
    expect(summaryRes.body.expenseTransactions[0].categoryResolution).toBe("fallback");
    expect(summaryRes.body.expenseTransactions[0].requestedCategoryId).toBe("cat_inexistente");

    const rulesBeforeReassignRes = await request(getIntegrationApp())
      .get("/api/v1/recurring-rules")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId);

    expect(rulesBeforeReassignRes.status).toBe(200);
    expect(rulesBeforeReassignRes.body[0].pendingFallbackCount).toBe(1);
    expect(rulesBeforeReassignRes.body[0].lastGenerationStatus).toBe("fallback");

    const reassignRes = await request(getIntegrationApp())
      .post(`/api/v1/recurring-rules/${ruleId}/reassign-category`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send({
        categoryId: "cat_casa",
        migratePastFallbackTransactions: true,
      });

    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.migratedTransactions).toBe(1);
    expect(reassignRes.body.rule.categoryId).toBe("cat_casa");
    expect(reassignRes.body.rule.pendingFallbackCount).toBe(0);

    const summaryAfterReassignRes = await request(getIntegrationApp())
      .get(`/api/v1/transactions?month=${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId);

    expect(summaryAfterReassignRes.status).toBe(200);
    expect(summaryAfterReassignRes.body.expenseTransactions).toHaveLength(1);
    expect(summaryAfterReassignRes.body.expenseTransactions[0].categoryId).toBe("cat_casa");
    expect(summaryAfterReassignRes.body.expenseTransactions[0].categoryResolution).toBe("direct");
    expect(summaryAfterReassignRes.body.expenseTransactions[0].requestedCategoryId).toBeUndefined();
  });

  test("income fallback uses default income category when original category is inactive", async () => {
    const month = monthKeyFromOffset(-1);

    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Joao",
      email: "joao.recurring@example.com",
      password: "StrongPass1!",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.accessToken as string;
    const personalAccountId = registerRes.body.user.personalAccountId as string;

    const incomeCategoriesRes = await request(getIntegrationApp())
      .get("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId);

    expect(incomeCategoriesRes.status).toBe(200);
    const defaultCategoryId = incomeCategoriesRes.body[0]?.id as string;

    const createIncomeCategoryRes = await request(getIntegrationApp())
      .post("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send({ name: "Salário" });

    expect(createIncomeCategoryRes.status).toBe(201);
    const salaryCategoryId = createIncomeCategoryRes.body.id as string;

    const createRuleRes = await request(getIntegrationApp())
      .post("/api/v1/recurring-rules")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send({
        type: "income",
        name: "Salário mensal",
        amount: 1000,
        dayOfMonth: 1,
        categoryId: salaryCategoryId,
        startMonth: month,
      });

    expect(createRuleRes.status).toBe(201);

    const deactivateSalaryCategoryRes = await request(getIntegrationApp())
      .patch(`/api/v1/income-categories/${salaryCategoryId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send({ active: false });

    expect(deactivateSalaryCategoryRes.status).toBe(200);

    const generateRes = await request(getIntegrationApp())
      .post(`/api/v1/recurring-rules/generate?month=${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId)
      .send();

    expect(generateRes.status).toBe(200);
    expect(generateRes.body.created).toBe(1);
    expect(generateRes.body.fallbackCreated).toBe(1);

    const summaryRes = await request(getIntegrationApp())
      .get(`/api/v1/transactions?month=${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-Account-Id", personalAccountId);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.incomeTransactions).toHaveLength(1);
    expect(summaryRes.body.incomeTransactions[0].categoryId).toBe(defaultCategoryId);
    expect(summaryRes.body.incomeTransactions[0].categoryResolution).toBe("fallback");
    expect(summaryRes.body.incomeTransactions[0].requestedCategoryId).toBe(salaryCategoryId);
  });
});
