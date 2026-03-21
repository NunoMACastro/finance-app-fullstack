import { AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setActiveAccountIdHeader } from "./account-store";
import { httpClient } from "./http-client";
import { tokenStore } from "./token-store";

function captureRequest(config: unknown): { authorization: string | null; accountId: string | null; url?: string } {
  const headers = AxiosHeaders.from((config as { headers?: unknown }).headers as never);
  const authorization = headers.get("Authorization");
  const accountId = headers.get("X-Account-Id");

  return {
    authorization: authorization == null ? null : String(authorization),
    accountId: accountId == null ? null : String(accountId),
    url: (config as { url?: string }).url,
  };
}

describe("http-client request interceptor", () => {
  const originalAdapter = httpClient.defaults.adapter;

  beforeEach(() => {
    tokenStore.clear();
    setActiveAccountIdHeader(null);

    httpClient.defaults.adapter = vi.fn(async (config) => {
      const request = captureRequest(config);
      return {
        data: request,
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }) as typeof httpClient.defaults.adapter;
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    tokenStore.clear();
    setActiveAccountIdHeader(null);
    vi.restoreAllMocks();
  });

  test("attaches X-Account-Id only to account-scoped requests", async () => {
    tokenStore.setAccess("access-token");
    setActiveAccountIdHeader("acc-123");

    const transactionsRes = await httpClient.get("/transactions?month=2026-03");
    expect(transactionsRes.data.authorization).toBe("Bearer access-token");
    expect(transactionsRes.data.accountId).toBe("acc-123");

    const statsRes = await httpClient.get("https://api.example.test/stats/semester?endingMonth=2026-03");
    expect(statsRes.data.authorization).toBe("Bearer access-token");
    expect(statsRes.data.accountId).toBe("acc-123");

    const authRes = await httpClient.post("/auth/login", {});
    expect(authRes.data.authorization).toBe("Bearer access-token");
    expect(authRes.data.accountId).toBeNull();

    const accountsRes = await httpClient.post("/accounts/join", { code: "ABC12345" });
    expect(accountsRes.data.authorization).toBe("Bearer access-token");
    expect(accountsRes.data.accountId).toBeNull();
  });

  test("removes a stale X-Account-Id header when no active account is set", async () => {
    tokenStore.setAccess("access-token");
    setActiveAccountIdHeader(null);

    const res = await httpClient.get("/transactions?month=2026-03", {
      headers: {
        "X-Account-Id": "stale-account",
      },
    });

    expect(res.data.authorization).toBe("Bearer access-token");
    expect(res.data.accountId).toBeNull();
  });
});
