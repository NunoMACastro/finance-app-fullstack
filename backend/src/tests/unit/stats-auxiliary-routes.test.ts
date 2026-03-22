import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { beforeEach, describe, expect, test, vi } from "vitest";

const statsMocks = vi.hoisted(() => ({
  compareBudget: vi.fn(),
  getLatestStatsInsight: vi.fn(),
}));

vi.mock("../../config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 3001,
    MONGODB_URI: "mongodb://127.0.0.1:27017/finance-v2",
    JWT_ACCESS_SECRET: "unit-access-secret",
    JWT_REFRESH_SECRET: "unit-refresh-secret",
    JWT_ISSUER: "finance-v2",
    JWT_AUDIENCE: "finance-v2-app",
    ACCESS_TOKEN_TTL_MINUTES: 15,
    REFRESH_TOKEN_TTL_DAYS: 7,
    REFRESH_COOKIE_NAME: "finance_v2_refresh",
    CORS_ORIGIN: "http://127.0.0.1:4173",
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX: 120,
    AUTH_RATE_LIMIT_MAX: 25,
    TRUST_PROXY: "1",
    METRICS_BEARER_TOKEN: "",
    REDIS_URL: "",
    OPENAI_API_KEY: "",
    OPENAI_INSIGHT_MODEL: "gpt-4.1-mini",
    OPENAI_INSIGHT_TIMEOUT_MS: 8_000,
    OPENAI_INSIGHT_CACHE_TTL_SECONDS: 300,
    CRON_ENABLED: false,
    TIMEZONE: "Europe/Lisbon",
  },
}));

vi.mock("../../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../middleware/auth.js", () => ({
  requireAuth: (req: { auth?: unknown }, _res: unknown, next: () => void) => {
    req.auth = {
      accountId: "account_1",
      userId: "user_1",
    };
    next();
  },
}));

vi.mock("../../middleware/account-context.js", () => ({
  requireStrictAccountContext: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireFinancialReadAccess: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireFinancialWriteAccess: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../../middleware/metrics.js", () => ({
  metricsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  getMetricsText: vi.fn(),
}));

vi.mock("../../modules/stats/service.js", () => ({
  compareBudget: statsMocks.compareBudget,
  getLatestStatsInsight: statsMocks.getLatestStatsInsight,
}));

import { createApp } from "../../app.js";

type MockResponse = EventEmitter & {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  text: string;
  status: (code: number) => MockResponse;
  setHeader: (name: string, value: string) => void;
  getHeader: (name: string) => string | undefined;
  removeHeader: (name: string) => void;
  json: (payload: unknown) => MockResponse;
  send: (payload?: unknown) => MockResponse;
  end: (payload?: unknown) => MockResponse;
  vary: (...fields: string[]) => MockResponse;
};

function createMockRequest(method: string, url: string): IncomingMessage {
  const request = new Readable({
    read() {
      this.push(null);
    },
  }) as IncomingMessage;
  const socket = new PassThrough() as PassThrough & {
    remoteAddress?: string;
    encrypted?: boolean;
  };
  socket.remoteAddress = "127.0.0.1";
  socket.encrypted = false;

  const headers: Record<string, string> = {};

  Object.assign(request, {
    method,
    url,
    originalUrl: url,
    baseUrl: "",
    headers,
    socket,
    connection: socket,
    app: undefined,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  });

  return request;
}

function createMockResponse(): MockResponse {
  const response = new EventEmitter() as MockResponse;
  response.statusCode = 200;
  response.headers = {};
  response.body = undefined;
  response.text = "";

  response.status = (code: number) => {
    response.statusCode = code;
    return response;
  };

  response.setHeader = (name: string, value: string) => {
    response.headers[name.toLowerCase()] = value;
  };

  response.getHeader = (name: string) => response.headers[name.toLowerCase()];

  response.removeHeader = (name: string) => {
    delete response.headers[name.toLowerCase()];
  };

  response.vary = (...fields: string[]) => {
    const current = response.getHeader("vary");
    const nextValue = [...new Set([...(current ? current.split(/,\s*/) : []), ...fields])].join(", ");
    response.setHeader("vary", nextValue);
    return response;
  };

  response.end = (payload?: unknown) => {
    if (payload !== undefined) {
      response.body = payload;
      response.text = typeof payload === "string" ? payload : JSON.stringify(payload);
    }
    queueMicrotask(() => {
      response.emit("finish");
    });
    return response;
  };

  response.json = (payload: unknown) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    return response.end(payload);
  };

  response.send = (payload?: unknown) => {
    if (payload !== undefined && typeof payload === "object" && payload !== null && !Buffer.isBuffer(payload)) {
      return response.json(payload);
    }

    if (payload !== undefined) {
      response.body = payload;
      response.text = String(payload);
    }
    if (!response.getHeader("content-type")) {
      response.setHeader("content-type", "text/plain; charset=utf-8");
    }
    return response.end();
  };

  return response;
}

async function invoke(url: string) {
  const app = createApp();
  const req = createMockRequest("GET", url);
  const res = createMockResponse();
  req.app = app as never;
  (res as unknown as { req: IncomingMessage }).req = req;

  const completed = new Promise<MockResponse>((resolve, reject) => {
    res.once("finish", () => resolve(res));
    app.handle(req, res, (error) => {
      if (error) {
        reject(error);
      }
    });
  });

  return completed;
}

describe("stats auxiliary routes", () => {
  beforeEach(() => {
    statsMocks.compareBudget.mockReset();
    statsMocks.getLatestStatsInsight.mockReset();
  });

  test("compare-budget returns a stable payload", async () => {
    statsMocks.compareBudget.mockResolvedValue({
      from: "2026-01",
      to: "2026-03",
      totals: {
        budgeted: 1200,
        actual: 1100,
        difference: 100,
      },
      items: [],
    });

    const res = await invoke("/api/v1/stats/compare-budget?from=2026-01&to=2026-03");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      from: "2026-01",
      to: "2026-03",
      totals: {
        budgeted: 1200,
        actual: 1100,
        difference: 100,
      },
      items: [],
    });
    expect(statsMocks.compareBudget).toHaveBeenCalledWith("account_1", "2026-01", "2026-03");
  });

  test("insights/latest returns 404 when there is no insight", async () => {
    statsMocks.getLatestStatsInsight.mockResolvedValue(null);

    const res = await invoke("/api/v1/stats/insights/latest?periodType=year&year=2026");

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      code: "STATS_INSIGHT_NOT_FOUND",
      message: "Ainda não existe insight IA para este período.",
    });
  });

  test("insights/latest returns the latest insight payload when available", async () => {
    statsMocks.getLatestStatsInsight.mockResolvedValue({
      id: "0123456789abcdef01234567",
      periodType: "year",
      periodKey: "2026",
      forecastWindow: 3,
      status: "ready",
      stale: false,
      requestedAt: "2026-03-22T00:00:00.000Z",
      generatedAt: "2026-03-22T00:00:00.000Z",
      model: "gpt-4.1-mini",
      report: {
        summary: "Resumo",
        highlights: [],
        risks: [],
        actions: [],
        categoryInsights: [],
        confidence: "high",
      },
      error: null,
    });

    const res = await invoke(
      "/api/v1/stats/insights/latest?periodType=year&year=2026&forecastWindow=3",
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: "0123456789abcdef01234567",
      periodType: "year",
      periodKey: "2026",
      status: "ready",
    });
    expect(statsMocks.getLatestStatsInsight).toHaveBeenCalledWith("account_1", {
      periodType: "year",
      year: 2026,
      forecastWindow: 3,
    });
  });
});
