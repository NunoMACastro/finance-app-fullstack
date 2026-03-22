import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { beforeEach, describe, expect, test, vi } from "vitest";

const budgetMocks = vi.hoisted(() => ({
  getBudgetTemplates: vi.fn(),
  addCategory: vi.fn(),
  removeCategory: vi.fn(),
  copyBudgetFromMonth: vi.fn(),
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

vi.mock("../../modules/budgets/service.js", () => ({
  getBudgetTemplates: budgetMocks.getBudgetTemplates,
  addCategory: budgetMocks.addCategory,
  removeCategory: budgetMocks.removeCategory,
  copyBudgetFromMonth: budgetMocks.copyBudgetFromMonth,
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

function createMockRequest(
  method: string,
  url: string,
  body?: unknown,
): IncomingMessage {
  const bodyText = body === undefined ? "" : JSON.stringify(body);
  const request = new Readable({
    read() {
      if (body === undefined) {
        this.push(null);
        return;
      }

      this.push(Buffer.from(bodyText));
      this.push(null);
    },
  }) as IncomingMessage;
  const socket = new PassThrough() as PassThrough & {
    remoteAddress?: string;
    encrypted?: boolean;
  };
  socket.remoteAddress = "127.0.0.1";
  socket.encrypted = false;

  const headers: Record<string, string> =
    body === undefined
      ? {}
      : {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(bodyText)),
        };

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

async function invoke(method: string, url: string, body?: unknown) {
  const app = createApp();
  const req = createMockRequest(method, url, body);
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

describe("budget auxiliary routes", () => {
  beforeEach(() => {
    budgetMocks.getBudgetTemplates.mockReset();
    budgetMocks.addCategory.mockReset();
    budgetMocks.removeCategory.mockReset();
    budgetMocks.copyBudgetFromMonth.mockReset();
  });

  test("templates returns the configured templates", async () => {
    budgetMocks.getBudgetTemplates.mockReturnValue([
      {
        id: "equilibrado",
        name: "Equilibrado",
        categories: [],
      },
    ]);

    const res = await invoke("GET", "/api/v1/budgets/templates");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      {
        id: "equilibrado",
        name: "Equilibrado",
        categories: [],
      },
    ]);
  });

  test("add category forwards the payload to the service", async () => {
    budgetMocks.addCategory.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1200,
      categories: [],
      isReady: false,
    });

    const res = await invoke("POST", "/api/v1/budgets/2026-03/categories", {
      name: "Lazer",
      percent: 10,
      kind: "expense",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      month: "2026-03",
      totalBudget: 1200,
      isReady: false,
    });
    expect(budgetMocks.addCategory).toHaveBeenCalledWith(
      "account_1",
      "2026-03",
      { name: "Lazer", percent: 10, kind: "expense" },
      "user_1",
    );
  });

  test("remove category forwards the route params to the service", async () => {
    budgetMocks.removeCategory.mockResolvedValue({
      month: "2026-03",
      totalBudget: 1200,
      categories: [],
      isReady: true,
    });

    const res = await invoke("DELETE", "/api/v1/budgets/2026-03/categories/cat_1");

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      month: "2026-03",
      totalBudget: 1200,
      isReady: true,
    });
    expect(budgetMocks.removeCategory).toHaveBeenCalledWith(
      "account_1",
      "2026-03",
      "cat_1",
      "user_1",
    );
  });

  test("copy-from forwards the source and target months", async () => {
    budgetMocks.copyBudgetFromMonth.mockResolvedValue({
      month: "2026-04",
      totalBudget: 1500,
      categories: [],
      isReady: false,
    });

    const res = await invoke("POST", "/api/v1/budgets/2026-04/copy-from/2026-03");

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      month: "2026-04",
      totalBudget: 1500,
      isReady: false,
    });
    expect(budgetMocks.copyBudgetFromMonth).toHaveBeenCalledWith(
      "account_1",
      "2026-04",
      "2026-03",
      "user_1",
    );
  });
});
