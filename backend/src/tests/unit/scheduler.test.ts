import { describe, expect, test, vi, beforeEach } from "vitest";

const schedulerState = vi.hoisted(() => ({
  env: {
    NODE_ENV: "test",
    CRON_ENABLED: false,
    TIMEZONE: "Europe/Lisbon",
  },
  schedule: vi.fn(),
  generateForAllAccountsMonth: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  monthFromDate: vi.fn(() => "2026-03"),
}));

vi.mock("../../config/env.js", () => ({
  env: schedulerState.env,
}));

vi.mock("../../config/logger.js", () => ({
  logger: {
    info: schedulerState.loggerInfo,
    warn: schedulerState.loggerWarn,
    error: schedulerState.loggerError,
  },
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: schedulerState.schedule,
  },
}));

vi.mock("../../lib/month.js", () => ({
  monthFromDate: schedulerState.monthFromDate,
}));

vi.mock("../../models/job-lock.model.js", () => ({
  JobLockModel: {
    findOneAndUpdate: schedulerState.findOneAndUpdate,
    updateOne: schedulerState.updateOne,
  },
}));

vi.mock("../../services.js", () => ({
  recurringService: {
    generateForAllAccountsMonth: schedulerState.generateForAllAccountsMonth,
  },
}));

import { startScheduler } from "../../jobs/scheduler.js";

describe("scheduler", () => {
  beforeEach(() => {
    schedulerState.schedule.mockReset();
    schedulerState.generateForAllAccountsMonth.mockReset();
    schedulerState.findOneAndUpdate.mockReset();
    schedulerState.updateOne.mockReset();
    schedulerState.loggerInfo.mockReset();
    schedulerState.loggerWarn.mockReset();
    schedulerState.loggerError.mockReset();
    schedulerState.monthFromDate.mockReturnValue("2026-03");
    schedulerState.env.NODE_ENV = "test";
    schedulerState.env.CRON_ENABLED = false;
    schedulerState.env.TIMEZONE = "Europe/Lisbon";
  });

  test("does not schedule when cron is disabled in test runtime", () => {
    startScheduler();

    expect(schedulerState.schedule).not.toHaveBeenCalled();
    expect(schedulerState.loggerInfo).toHaveBeenCalledWith("Scheduler disabled");
  });

  test("schedules the daily job with the configured timezone", () => {
    schedulerState.env.NODE_ENV = "production";
    schedulerState.env.CRON_ENABLED = true;

    startScheduler();

    expect(schedulerState.schedule).toHaveBeenCalledTimes(1);
    expect(schedulerState.schedule).toHaveBeenCalledWith(
      "10 0 * * *",
      expect.any(Function),
      { timezone: "Europe/Lisbon" },
    );
    expect(schedulerState.loggerInfo).toHaveBeenCalledWith(
      { timezone: "Europe/Lisbon" },
      "Scheduler started",
    );
  });

  test("runs the recurring generation job when the lease is acquired", async () => {
    schedulerState.env.NODE_ENV = "production";
    schedulerState.env.CRON_ENABLED = true;
    schedulerState.findOneAndUpdate.mockImplementation(async (_filter: unknown, update: any) => ({
      ownerId: update.$set.ownerId,
    }));
    schedulerState.updateOne.mockResolvedValue({ modifiedCount: 1 });
    schedulerState.generateForAllAccountsMonth.mockResolvedValue({
      totalCreated: 3,
      totalFallbackCreated: 1,
      totalProcessedRules: 4,
    });

    startScheduler();
    const scheduledJob = schedulerState.schedule.mock.calls[0]?.[1] as (() => Promise<void>) | undefined;
    expect(scheduledJob).toBeTypeOf("function");
    await scheduledJob?.();

    expect(schedulerState.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(schedulerState.generateForAllAccountsMonth).toHaveBeenCalledWith(
      "2026-03",
      expect.any(Date),
    );
    expect(schedulerState.updateOne).toHaveBeenCalledTimes(1);
    expect(schedulerState.loggerInfo).toHaveBeenCalledWith(
      {
        month: "2026-03",
        totalCreated: 3,
        totalFallbackCreated: 1,
        totalProcessedRules: 4,
      },
      "Recurring generation complete",
    );
  });
});
