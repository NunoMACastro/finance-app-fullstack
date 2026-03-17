import { describe, expect, test } from "vitest";
import request from "supertest";
import { getIntegrationApp } from "./harness.js";

function monthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("income categories integration", () => {
  test("default category protection and income validation", async () => {
    const month = monthKeyFromNow();

    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Income User",
      email: "income@example.com",
      password: "123456",
    });

    expect(registerRes.status).toBe(201);
    const accessToken = registerRes.body.tokens.accessToken as string;

    const budgetRes = await request(getIntegrationApp())
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        totalBudget: 0,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60 },
          { id: "cat_lazer", name: "Lazer", percent: 40 },
        ],
      });

    expect(budgetRes.status).toBe(200);

    const listRes = await request(getIntegrationApp())
      .get("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body[0]?.isDefault).toBe(true);

    const defaultCategoryId = listRes.body[0]?.id as string;

    const disableDefault = await request(getIntegrationApp())
      .patch(`/api/v1/income-categories/${defaultCategoryId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ active: false });

    expect(disableDefault.status).toBe(422);
    expect(disableDefault.body.code).toBe("INCOME_CATEGORY_DEFAULT_PROTECTED");

    const deleteDefault = await request(getIntegrationApp())
      .delete(`/api/v1/income-categories/${defaultCategoryId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(deleteDefault.status).toBe(422);
    expect(deleteDefault.body.code).toBe("INCOME_CATEGORY_DEFAULT_PROTECTED");

    const createCategory = await request(getIntegrationApp())
      .post("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Freelance" });

    expect(createCategory.status).toBe(201);
    const freelanceCategoryId = createCategory.body.id as string;

    const incomeSuccess = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-08`,
        type: "income",
        origin: "manual",
        description: "Projeto X",
        amount: 500,
        categoryId: freelanceCategoryId,
      });

    expect(incomeSuccess.status).toBe(201);

    const disableFreelance = await request(getIntegrationApp())
      .patch(`/api/v1/income-categories/${freelanceCategoryId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ active: false });

    expect(disableFreelance.status).toBe(200);
    expect(disableFreelance.body.active).toBe(false);

    const incomeInactiveCategory = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-09`,
        type: "income",
        origin: "manual",
        description: "Projeto Y",
        amount: 450,
        categoryId: freelanceCategoryId,
      });

    expect(incomeInactiveCategory.status).toBe(422);
    expect(incomeInactiveCategory.body.code).toBe("INCOME_CATEGORY_INACTIVE");

    const incomeWithoutCategory = await request(getIntegrationApp())
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        month,
        date: `${month}-10`,
        type: "income",
        origin: "manual",
        description: "Projeto Z",
        amount: 300,
      });

    expect(incomeWithoutCategory.status).toBe(422);
    expect(incomeWithoutCategory.body.code).toBe("INCOME_CATEGORY_REQUIRED");
  });
});
