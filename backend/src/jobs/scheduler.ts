import { randomUUID } from "node:crypto";
import cron from "node-cron";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { monthFromDate } from "../lib/month.js";
import { JobLockModel } from "../models/job-lock.model.js";
import { recurringService } from "../services.js";

const DAILY_JOB_NAME = "daily-recurring-generation";
const LOCK_WINDOW_MS = 15 * 60 * 1000;

async function acquireJobLock(jobName: string, ownerId: string): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_WINDOW_MS);

  try {
    const result = await JobLockModel.findOneAndUpdate(
      {
        jobName,
        $or: [
          { lockedUntil: { $lte: now } },
          { ownerId },
        ],
      },
      {
        $set: {
          ownerId,
          lockedUntil,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return result.ownerId === ownerId;
  } catch (error) {
    const maybeMongoError = error as { code?: number };
    if (maybeMongoError.code === 11000) {
      return false;
    }
    throw error;
  }
}

async function releaseJobLock(jobName: string, ownerId: string): Promise<void> {
  await JobLockModel.updateOne(
    {
      jobName,
      ownerId,
    },
    {
      $set: {
        lockedUntil: new Date(0),
      },
    },
  );
}

export function startScheduler(): void {
  if (!env.CRON_ENABLED || env.NODE_ENV === "test") {
    logger.info("Scheduler disabled");
    return;
  }

  cron.schedule(
    "10 0 * * *",
    async () => {
      const ownerId = randomUUID();
      const lockAcquired = await acquireJobLock(DAILY_JOB_NAME, ownerId);
      if (!lockAcquired) {
        logger.warn({ jobName: DAILY_JOB_NAME }, "Skipping scheduler run because another instance holds the lease");
        return;
      }

      const month = monthFromDate(new Date());
      logger.info({ month }, "Starting daily recurring job");

      try {
        const recurringResult = await recurringService.generateForAllAccountsMonth(month, new Date());
        logger.info(
          {
            month,
            totalCreated: recurringResult.totalCreated,
            totalFallbackCreated: recurringResult.totalFallbackCreated,
            totalProcessedRules: recurringResult.totalProcessedRules,
          },
          "Recurring generation complete",
        );
      } catch (error) {
        logger.error({ err: error, month }, "Daily recurring generation failed");
      } finally {
        await releaseJobLock(DAILY_JOB_NAME, ownerId);
      }
    },
    {
      timezone: env.TIMEZONE,
    },
  );

  logger.info({ timezone: env.TIMEZONE }, "Scheduler started");
}
