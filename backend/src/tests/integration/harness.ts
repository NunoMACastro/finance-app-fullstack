import type { Express } from "express";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { beforeAll, beforeEach } from "vitest";

let mongo: MongoMemoryReplSet | undefined;
let app: Express | undefined;
let disconnectDb: (() => Promise<void>) | undefined;
let bootstrapped = false;
let teardownRegistered = false;

async function shutdownHarness() {
  if (!bootstrapped) return;
  if (disconnectDb) {
    await disconnectDb();
  }
  if (mongo) {
    await mongo.stop();
  }
  bootstrapped = false;
  app = undefined;
  disconnectDb = undefined;
  mongo = undefined;
}

function registerProcessTeardown() {
  if (teardownRegistered) return;
  teardownRegistered = true;
  process.once("beforeExit", () => {
    void shutdownHarness();
  });
}

async function clearDatabase() {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

beforeAll(async () => {
  if (bootstrapped) return;

  process.env.NODE_ENV = "test";
  process.env.CRON_ENABLED = "false";
  process.env.OPENAI_API_KEY = "";
  process.env.RATE_LIMIT_MAX = "100000";
  process.env.AUTH_RATE_LIMIT_MAX = "100000";

  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ ip: "127.0.0.1" }],
  });
  process.env.MONGODB_URI = mongo.getUri();

  const dbModule = await import("../../config/db.js");
  const appModule = await import("../../app.js");

  await dbModule.connectDb();
  disconnectDb = dbModule.disconnectDb;
  app = appModule.createApp();
  bootstrapped = true;
  registerProcessTeardown();
});

beforeEach(async () => {
  await clearDatabase();
});

export function getIntegrationApp(): Express {
  if (!app) {
    throw new Error("Integration harness is not initialized");
  }
  return app;
}
