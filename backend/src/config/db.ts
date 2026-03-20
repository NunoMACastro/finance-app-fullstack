import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

function sanitizeMongoUri(uri: string): string {
  return uri.replace(/\/\/([^@/]+)@/, "//***@");
}

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  logger.info({ uri: sanitizeMongoUri(env.MONGODB_URI) }, "MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function checkDbRuntimeReadiness(): Promise<{ ready: boolean; reason?: string }> {
  if (!isDbReady() || !mongoose.connection.db) {
    return { ready: false, reason: "mongo_not_connected" };
  }

  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    const supportsTransactions =
      Boolean(hello.logicalSessionTimeoutMinutes) &&
      (Boolean(hello.setName) || hello.msg === "isdbgrid");

    if (!supportsTransactions) {
      return { ready: false, reason: "mongo_topology_no_transactions" };
    }

    return { ready: true };
  } catch {
    return { ready: false, reason: "mongo_ping_failed" };
  }
}
