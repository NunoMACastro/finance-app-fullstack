import { Histogram, Counter, Registry, collectDefaultMetrics } from "prom-client";
import type { NextFunction, Request, Response } from "express";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

const requestCounter = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

const requestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [registry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };

    requestCounter.inc(labels, 1);
    requestDuration.observe(labels, durationSeconds);
  });

  next();
}

export async function getMetricsText(): Promise<string> {
  return registry.metrics();
}
