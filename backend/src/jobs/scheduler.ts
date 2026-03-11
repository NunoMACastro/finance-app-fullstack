import cron from "node-cron";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { monthFromDate } from "../lib/month.js";
import { AccountModel } from "../models/account.model.js";
import { recurringService, statsService } from "../services.js";

export function startScheduler(): void {
  if (!env.CRON_ENABLED || env.NODE_ENV === "test") {
    logger.info("Scheduler disabled");
    return;
  }

  cron.schedule(
    "10 0 * * *",
    async () => {
      const month = monthFromDate(new Date());
      logger.info({ month }, "Starting daily recurring/stats job");

      const totalCreated = await recurringService.generateForAllAccountsMonth(month);
      logger.info({ month, totalCreated }, "Recurring generation complete");

      const accounts = await AccountModel.find({}, { _id: 1 }).lean();
      for (const account of accounts) {
        await statsService.materializeCurrentSnapshots(account._id.toString());
      }

      logger.info({ accounts: accounts.length }, "Stats snapshots updated");
    },
    {
      timezone: env.TIMEZONE,
    },
  );

  logger.info({ timezone: env.TIMEZONE }, "Scheduler started");
}
