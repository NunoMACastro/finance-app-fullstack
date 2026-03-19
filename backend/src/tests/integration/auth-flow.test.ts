import { describe, expect, test } from "vitest";
import request from "supertest";
import { getIntegrationApp } from "./harness.js";

describe("auth flow integration", () => {
  test("register -> login -> me", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Joao",
      email: "joao@example.com",
      password: "123456",
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body?.tokens?.accessToken).toBeTypeOf("string");
    expect(registerRes.body?.user?.tutorialSeenAt).toBeNull();
    expect(registerRes.body?.user?.personalAccountId).toMatch(/^[a-fA-F0-9]{24}$/);
    expect(registerRes.body?.user?.preferences?.themePalette).toBe("ciano");

    const loginRes = await request(getIntegrationApp()).post("/api/v1/auth/login").send({
      email: "joao@example.com",
      password: "123456",
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.tokens.accessToken;

    const meRes = await request(getIntegrationApp())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("joao@example.com");
    expect(meRes.body.tutorialSeenAt).toBeNull();
    expect(meRes.body.personalAccountId).toMatch(/^[a-fA-F0-9]{24}$/);
    expect(meRes.body.preferences?.themePalette).toBe("ciano");

    const tutorialRes = await request(getIntegrationApp())
      .post("/api/v1/auth/tutorial/complete")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(tutorialRes.status).toBe(200);
    expect(typeof tutorialRes.body.tutorialSeenAt).toBe("string");
    expect(tutorialRes.body.personalAccountId).toMatch(/^[a-fA-F0-9]{24}$/);

    const parallelMe = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(getIntegrationApp()).get("/api/v1/auth/me").set("Authorization", `Bearer ${accessToken}`),
      ),
    );
    for (const res of parallelMe) {
      expect(res.status).toBe(200);
    }

    const accountsRes = await request(getIntegrationApp())
      .get("/api/v1/accounts")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(accountsRes.status).toBe(200);
    const personalAccounts = (accountsRes.body as Array<{ type: string }>).filter(
      (account) => account.type === "personal",
    );
    expect(personalAccounts).toHaveLength(1);

    const incomeCategoriesRes = await request(getIntegrationApp())
      .get("/api/v1/income-categories")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(incomeCategoriesRes.status).toBe(200);
    expect(Array.isArray(incomeCategoriesRes.body)).toBe(true);
    expect(incomeCategoriesRes.body.length).toBeGreaterThanOrEqual(1);
    expect(incomeCategoriesRes.body[0]?.isDefault).toBe(true);
    expect(incomeCategoriesRes.body[0]?.active).toBe(true);
  });
});
