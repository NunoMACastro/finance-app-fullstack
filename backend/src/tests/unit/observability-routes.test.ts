import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { beforeEach, describe, expect, test, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  checkDbRuntimeReadiness: vi.fn(),
  getMetricsText: vi.fn(),
}));

vi.mock("../../config/db.js", () => ({
  checkDbRuntimeReadiness: dbMocks.checkDbRuntimeReadiness,
  connectDb: vi.fn(),
  disconnectDb: vi.fn(),
  isDbReady: vi.fn(),
}));

vi.mock("../../middleware/metrics.js", () => ({
  metricsMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  getMetricsText: dbMocks.getMetricsText,
}));

vi.mock("../../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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
    METRICS_BEARER_TOKEN: "unit-metrics-token",
    REDIS_URL: "",
    OPENAI_API_KEY: "",
    OPENAI_INSIGHT_MODEL: "gpt-4.1-mini",
    OPENAI_INSIGHT_TIMEOUT_MS: 8_000,
    OPENAI_INSIGHT_CACHE_TTL_SECONDS: 300,
    CRON_ENABLED: false,
    TIMEZONE: "Europe/Lisbon",
  },
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

function createMockRequest(method: string, url: string, headers: Record<string, string> = {}): IncomingMessage {
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

  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  ) as Record<string, string>;

  Object.assign(request, {
    method,
    url,
    originalUrl: url,
    baseUrl: "",
    headers: normalizedHeaders,
    socket,
    connection: socket,
    app: undefined,
    get(name: string) {
      return normalizedHeaders[name.toLowerCase()];
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

async function invoke(method: string, url: string, headers: Record<string, string> = {}) {
  const app = createApp();
  const req = createMockRequest(method, url, headers);
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

describe("observability routes", () => {
  beforeEach(() => {
    dbMocks.checkDbRuntimeReadiness.mockReset();
    dbMocks.getMetricsText.mockReset();
  });

  test("health returns ok", async () => {
    const res = await invoke("GET", "/health");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("ready returns ready when runtime DB readiness passes", async () => {
    dbMocks.checkDbRuntimeReadiness.mockResolvedValue({ ready: true });

    const res = await invoke("GET", "/ready");

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
    expect(dbMocks.checkDbRuntimeReadiness).toHaveBeenCalledTimes(1);
  });

  test("ready returns not_ready when runtime DB readiness fails", async () => {
    dbMocks.checkDbRuntimeReadiness.mockResolvedValue({
      ready: false,
      reason: "mongo_not_connected",
    });

    const res = await invoke("GET", "/ready");

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      status: "not_ready",
      reason: "mongo_not_connected",
    });
  });

  test("metrics is auth gated and exposes Prometheus text when authorized", async () => {
    dbMocks.getMetricsText.mockResolvedValue("# HELP http_requests_total Total HTTP requests\n");

    const unauthorizedRes = await invoke("GET", "/metrics");
    expect(unauthorizedRes.statusCode).toBe(401);
    expect(unauthorizedRes.body).toEqual({
      code: "UNAUTHORIZED",
      message: "Credenciais inválidas para métricas",
    });

    const authorizedRes = await invoke("GET", "/metrics", {
      authorization: "Bearer unit-metrics-token",
    });

    expect(authorizedRes.statusCode).toBe(200);
    expect(authorizedRes.getHeader("content-type")).toContain("text/plain");
    expect(authorizedRes.text).toContain("http_requests_total");
    expect(dbMocks.getMetricsText).toHaveBeenCalledTimes(1);
  });
});
