import type { Server } from "node:http";
import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startScheduler } from "./jobs/scheduler.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function bootstrap() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Backend listening");
  });

  startScheduler();

  let shuttingDown = false;
  const shutdown = async (signal: "SIGINT" | "SIGTERM") => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");

    const timeout = setTimeout(() => {
      logger.error({ signal, timeoutMs: SHUTDOWN_TIMEOUT_MS }, "Graceful shutdown timeout exceeded");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timeout.unref();

    try {
      await closeHttpServer(server);
      await disconnectDb();
      clearTimeout(timeout);
      logger.info({ signal }, "Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      clearTimeout(timeout);
      logger.error({ err: error, signal }, "Graceful shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to bootstrap backend");
  process.exit(1);
});
