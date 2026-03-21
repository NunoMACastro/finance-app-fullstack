import type { Request, Response } from "express";
import { env } from "../config/env.js";

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    secure: env.NODE_ENV === "production",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function parseCookieHeader(headerValue?: string): Record<string, string> {
  if (!headerValue) return {};

  return headerValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const index = item.indexOf("=");
      if (index <= 0) return acc;
      const key = item.slice(0, index).trim();
      const value = item.slice(index + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

export function getCookie(req: Request, name: string): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[name];
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, getRefreshCookieOptions());
}
