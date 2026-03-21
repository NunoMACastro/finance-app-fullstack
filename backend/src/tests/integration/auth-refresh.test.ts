import { describe, expect, test } from "vitest";
import request from "supertest";
import { RefreshTokenModel } from "../../models/refresh-token.model.js";
import { getIntegrationApp } from "./harness.js";

const REFRESH_COOKIE_NAME = "finance_v2_refresh";

function extractRefreshTokenFromSetCookie(setCookie: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const refreshCookie = cookies.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE_NAME}=`));

  if (!refreshCookie) {
    throw new Error("Refresh cookie not found in response");
  }

  return refreshCookie.split(";")[0]!.slice(`${REFRESH_COOKIE_NAME}=`.length);
}

function getRefreshCookieHeader(refreshToken: string): string {
  return `${REFRESH_COOKIE_NAME}=${refreshToken}`;
}

describe("auth refresh rotation", () => {
  test("refresh works with cookie and body and rejects replayed tokens", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Refresh Cookie User",
      email: "refresh-cookie@example.com",
      password: "StrongPass1!",
    });

    expect(registerRes.status).toBe(201);
    const userId = registerRes.body.user.id as string;
    const initialRefreshToken = extractRefreshTokenFromSetCookie(registerRes.headers["set-cookie"]);

    const cookieRefreshRes = await request(getIntegrationApp())
      .post("/api/v1/auth/refresh")
      .set("Cookie", getRefreshCookieHeader(initialRefreshToken))
      .send({});

    expect(cookieRefreshRes.status).toBe(200);
    expect(cookieRefreshRes.body.accessToken).toBeTypeOf("string");

    const bodyRefreshToken = extractRefreshTokenFromSetCookie(cookieRefreshRes.headers["set-cookie"]);
    const bodyRefreshRes = await request(getIntegrationApp())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: bodyRefreshToken });

    expect(bodyRefreshRes.status).toBe(200);
    expect(bodyRefreshRes.body.accessToken).toBeTypeOf("string");

    const replayRes = await request(getIntegrationApp())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: bodyRefreshToken });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.code).toBe("REFRESH_TOKEN_REVOKED");

    const tokenCount = await RefreshTokenModel.countDocuments({ userId });
    expect(tokenCount).toBe(3);
  });

  test("refresh allows exactly one winner when the same token is used concurrently", async () => {
    const registerRes = await request(getIntegrationApp()).post("/api/v1/auth/register").send({
      name: "Refresh Race User",
      email: "refresh-race@example.com",
      password: "StrongPass1!",
    });

    expect(registerRes.status).toBe(201);
    const userId = registerRes.body.user.id as string;
    const refreshToken = extractRefreshTokenFromSetCookie(registerRes.headers["set-cookie"]);

    const [firstRes, secondRes] = await Promise.all([
      request(getIntegrationApp()).post("/api/v1/auth/refresh").send({ refreshToken }),
      request(getIntegrationApp()).post("/api/v1/auth/refresh").send({ refreshToken }),
    ]);

    const statuses = [firstRes.status, secondRes.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 401]);

    const winnerRes = firstRes.status === 200 ? firstRes : secondRes;
    expect(winnerRes.body.accessToken).toBeTypeOf("string");

    const winnerRefreshToken = extractRefreshTokenFromSetCookie(winnerRes.headers["set-cookie"]);
    const followUpRes = await request(getIntegrationApp())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: winnerRefreshToken });

    expect(followUpRes.status).toBe(200);
    expect(followUpRes.body.accessToken).toBeTypeOf("string");

    const tokenCount = await RefreshTokenModel.countDocuments({ userId });
    expect(tokenCount).toBe(3);
  });
});
