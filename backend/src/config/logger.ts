import pino from "pino";
import { env } from "./env.js";

const REDACTED_LOG_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "body.password",
  "body.currentPassword",
  "body.newPassword",
  "body.refreshToken",
  "refreshToken",
  "accessToken",
  "authorization",
];

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: REDACTED_LOG_PATHS,
    censor: "[Redacted]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        }
      : undefined,
});
