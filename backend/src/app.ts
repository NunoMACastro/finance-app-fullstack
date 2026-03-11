import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { isDbReady } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { getMetricsText, metricsMiddleware } from "./middleware/metrics.js";
import { apiRouter } from "./routes/index.js";

function parseCorsOrigins(raw: string): string[] | "*" {
  if (raw.trim() === "*") return "*";
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const corsOrigins = parseCorsOrigins(env.CORS_ORIGIN);

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    const headerId = req.headers["x-request-id"];
    const requestId =
      typeof headerId === "string" && headerId.trim().length > 0
        ? headerId
        : randomUUID();

    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info(
        {
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          elapsedMs: Number(elapsedMs.toFixed(2)),
        },
        "request completed",
      );
    });

    next();
  });

  app.use(helmet());
  app.use(
    cors(
      corsOrigins === "*"
        ? undefined
        : {
            origin: corsOrigins,
            credentials: true,
          },
    ),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(metricsMiddleware);

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        code: "RATE_LIMITED",
        message: "Demasiados pedidos. Tente novamente em alguns instantes.",
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/ready", (_req, res) => {
    if (!isDbReady()) {
      res.status(503).json({ status: "not_ready" });
      return;
    }

    res.status(200).json({ status: "ready" });
  });

  app.get("/metrics", async (_req, res) => {
    const data = await getMetricsText();
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.status(200).send(data);
  });

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
