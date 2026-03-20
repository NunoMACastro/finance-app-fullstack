import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  MONGODB_URI: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ISSUER: z.string().default("finance-v2"),
  JWT_AUDIENCE: z.string().default("finance-v2-app"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  REFRESH_COOKIE_NAME: z.string().trim().min(1).default("finance_v2_refresh"),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(25),
  TRUST_PROXY: z.string().default("1"),
  METRICS_BEARER_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_INSIGHT_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_INSIGHT_TIMEOUT_MS: z.coerce.number().int().positive().default(2500),
  OPENAI_INSIGHT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  CRON_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() === "true"),
  TIMEZONE: z.string().default("Europe/Lisbon"),
});

const parsedRaw = rawEnvSchema.safeParse(process.env);

if (!parsedRaw.success) {
  const issues = parsedRaw.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const raw = parsedRaw.data;

function requireInProduction(value: string | undefined, key: string): string {
  const trimmed = value?.trim();
  if (raw.NODE_ENV === "production" && !trimmed) {
    throw new Error(`Invalid environment configuration: ${key} is required in production`);
  }
  return trimmed ?? "";
}

const mongodbUri =
  requireInProduction(raw.MONGODB_URI, "MONGODB_URI") || "mongodb://127.0.0.1:27017/finance-v2";
const jwtAccessSecret =
  requireInProduction(raw.JWT_ACCESS_SECRET, "JWT_ACCESS_SECRET") || "dev-access-secret";
const jwtRefreshSecret =
  requireInProduction(raw.JWT_REFRESH_SECRET, "JWT_REFRESH_SECRET") || "dev-refresh-secret";
const corsOrigin = requireInProduction(raw.CORS_ORIGIN, "CORS_ORIGIN") || "*";
const openaiApiKey = raw.OPENAI_API_KEY?.trim() ?? "";

if (raw.NODE_ENV === "production" && corsOrigin.trim() === "*") {
  throw new Error("Invalid environment configuration: CORS_ORIGIN='*' is not allowed in production");
}

export const env = {
  NODE_ENV: raw.NODE_ENV,
  PORT: raw.PORT,
  MONGODB_URI: mongodbUri,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  JWT_ISSUER: raw.JWT_ISSUER,
  JWT_AUDIENCE: raw.JWT_AUDIENCE,
  ACCESS_TOKEN_TTL_MINUTES: raw.ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_TTL_DAYS: raw.REFRESH_TOKEN_TTL_DAYS,
  REFRESH_COOKIE_NAME: raw.REFRESH_COOKIE_NAME,
  CORS_ORIGIN: corsOrigin,
  RATE_LIMIT_WINDOW_MS: raw.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX: raw.RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX: raw.AUTH_RATE_LIMIT_MAX,
  TRUST_PROXY: raw.TRUST_PROXY.trim(),
  METRICS_BEARER_TOKEN: raw.METRICS_BEARER_TOKEN?.trim() ?? "",
  REDIS_URL: raw.REDIS_URL?.trim() ?? "",
  OPENAI_API_KEY: openaiApiKey,
  OPENAI_INSIGHT_MODEL: raw.OPENAI_INSIGHT_MODEL,
  OPENAI_INSIGHT_TIMEOUT_MS: raw.OPENAI_INSIGHT_TIMEOUT_MS,
  OPENAI_INSIGHT_CACHE_TTL_SECONDS: raw.OPENAI_INSIGHT_CACHE_TTL_SECONDS,
  CRON_ENABLED: raw.CRON_ENABLED,
  TIMEZONE: raw.TIMEZONE,
} as const;
