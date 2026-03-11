import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

function monthKeyFromNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

describe("accounts flow integration", () => {
  let mongo: MongoMemoryReplSet;
  let app: import("express").Express;
  let disconnectDb: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      instanceOpts: [{ ip: "127.0.0.1" }],
    });
    process.env.NODE_ENV = "test";
    process.env.CRON_ENABLED = "false";
    process.env.MONGODB_URI = mongo.getUri();

    const db = await import("../../config/db.js");
    const appModule = await import("../../app.js");

    await db.connectDb();
    disconnectDb = db.disconnectDb;
    app = appModule.createApp();
  });

  afterAll(async () => {
    if (disconnectDb) {
      await disconnectDb();
    }
    if (mongo) {
      await mongo.stop();
    }
  });

  test("shared account supports invite/join, role permissions and dataset isolation", async () => {
    const month = monthKeyFromNow();

    const ownerRegister = await request(app).post("/api/v1/auth/register").send({
      name: "Owner",
      email: "owner@example.com",
      password: "123456",
    });
    expect(ownerRegister.status).toBe(201);

    const memberRegister = await request(app).post("/api/v1/auth/register").send({
      name: "Member",
      email: "member@example.com",
      password: "123456",
    });
    expect(memberRegister.status).toBe(201);

    const ownerToken = ownerRegister.body.tokens.accessToken as string;
    const memberToken = memberRegister.body.tokens.accessToken as string;

    const createShared = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Familia Silva" });

    expect(createShared.status).toBe(201);
    const sharedAccountId = createShared.body.id as string;

    const inviteRes = await request(app)
      .post(`/api/v1/accounts/${sharedAccountId}/invite-codes`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.code).toBeTypeOf("string");

    const joinRes = await request(app)
      .post("/api/v1/accounts/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ code: inviteRes.body.code });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.role).toBe("viewer");

    const viewerWriteBlocked = await request(app)
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId)
      .send({
        totalBudget: 999,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60 },
          { id: "cat_lazer", name: "Lazer", percent: 5 },
          { id: "cat_invest", name: "Investimento", percent: 15 },
          { id: "cat_poup", name: "Poupanca", percent: 20 },
        ],
      });

    expect(viewerWriteBlocked.status).toBe(403);
    expect(viewerWriteBlocked.body.code).toBe("ACCOUNT_ROLE_FORBIDDEN");

    const promoteEditor = await request(app)
      .patch(`/api/v1/accounts/${sharedAccountId}/members/${memberRegister.body.user.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "editor" });

    expect(promoteEditor.status).toBe(200);
    expect(promoteEditor.body.role).toBe("editor");

    const budgetRes = await request(app)
      .put(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId)
      .send({
        totalBudget: 999,
        categories: [
          { id: "cat_despesas", name: "Despesas", percent: 60 },
          { id: "cat_lazer", name: "Lazer", percent: 5 },
          { id: "cat_invest", name: "Investimento", percent: 15 },
          { id: "cat_poup", name: "Poupanca", percent: 20 },
        ],
      });

    expect(budgetRes.status).toBe(200);
    expect(budgetRes.body.isReady).toBe(true);

    const incomeRes = await request(app)
      .post("/api/v1/transactions")
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId)
      .send({
        month,
        date: `${month}-10`,
        type: "income",
        origin: "manual",
        description: "Ordenado",
        amount: 1500,
        categoryId: "cat_despesas",
      });

    expect(incomeRes.status).toBe(201);

    const sharedBudget = await request(app)
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .set("X-Account-Id", sharedAccountId);

    expect(sharedBudget.status).toBe(200);
    expect(sharedBudget.body.totalBudget).toBe(1500);
    expect(sharedBudget.body.categories.length).toBe(4);

    const personalBudget = await request(app)
      .get(`/api/v1/budgets/${month}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(personalBudget.status).toBe(200);
    expect(personalBudget.body.totalBudget).toBe(0);
    expect(personalBudget.body.categories).toEqual([]);

    const ownerLeaveBlocked = await request(app)
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(ownerLeaveBlocked.status).toBe(422);
    expect(ownerLeaveBlocked.body.code).toBe("LAST_OWNER_CANNOT_LEAVE");

    const promoteOwner = await request(app)
      .patch(`/api/v1/accounts/${sharedAccountId}/members/${memberRegister.body.user.id}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "owner" });

    expect(promoteOwner.status).toBe(200);

    const ownerLeave = await request(app)
      .post(`/api/v1/accounts/${sharedAccountId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});

    expect(ownerLeave.status).toBe(204);
  });
});
