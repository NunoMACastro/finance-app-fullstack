/**
 * Token Store — centralises access/refresh token persistence.
 *
 * Uses localStorage by default. Swap the implementation (e.g. for
 * secure cookies or in-memory storage) by changing the get/set/clear below.
 */

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

export const tokenStore = {
  // ---- Access token ----
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  setAccess(token: string): void {
    localStorage.setItem(ACCESS_KEY, token);
  },

  // ---- Refresh token ----
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setRefresh(token: string): void {
    localStorage.setItem(REFRESH_KEY, token);
  },

  // ---- Pair helpers ----
  setBoth(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  /** Returns true if an access token exists (does NOT validate expiry). */
  hasTokens(): boolean {
    return !!localStorage.getItem(ACCESS_KEY);
  },

  /**
   * Decode a JWT payload (without verifying signature) to read `exp`.
   * Returns null if the token is malformed.
   */
  decodePayload(token: string): Record<string, unknown> | null {
    try {
      const base64 = token.split(".")[1];
      if (!base64) return null;
      const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json);
    } catch {
      return null;
    }
  },

  /** Returns true if the access token is expired (or missing). */
  isAccessExpired(): boolean {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) return true;
    const payload = tokenStore.decodePayload(token);
    if (!payload || typeof payload.exp !== "number") return true;
    // exp is in seconds, Date.now() in ms
    return payload.exp * 1000 < Date.now();
  },
};
