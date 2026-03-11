import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { startScheduler } from "./jobs/scheduler.js";

async function bootstrap() {
  await connectDb();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Backend listening");
  });

  startScheduler();
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to bootstrap backend");
  process.exit(1);
});
