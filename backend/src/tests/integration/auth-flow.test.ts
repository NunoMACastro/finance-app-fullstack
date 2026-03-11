import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

const describeIfIntegration =
  process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

describeIfIntegration("auth flow integration", () => {
  let mongo: MongoMemoryServer;
  let app: import("express").Express;
  let disconnectDb: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
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

  test("register -> login -> me", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      name: "Joao",
      email: "joao@example.com",
      password: "123456",
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body?.tokens?.accessToken).toBeTypeOf("string");

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "joao@example.com",
      password: "123456",
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.tokens.accessToken;

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("joao@example.com");
  });
});
