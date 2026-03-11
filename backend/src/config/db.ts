import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  logger.info({ uri: env.MONGODB_URI }, "MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbReady(): boolean {
  return mongoose.connection.readyState === 1;
}
