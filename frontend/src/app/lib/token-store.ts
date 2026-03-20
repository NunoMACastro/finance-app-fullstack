/**
 * Token Store — keeps the short-lived access token only in memory.
 *
 * Refresh tokens live in an HttpOnly cookie and are never exposed to JS.
 */

let accessToken: string | null = null;

export const tokenStore = {
  // ---- Access token ----
  getAccess(): string | null {
    return accessToken;
  },
  setAccess(token: string): void {
    accessToken = token;
  },

  clear(): void {
    accessToken = null;
  },

  /** Returns true if an access token exists (does NOT validate expiry). */
  hasTokens(): boolean {
    return !!accessToken;
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
    const token = accessToken;
    if (!token) return true;
    const payload = tokenStore.decodePayload(token);
    if (!payload || typeof payload.exp !== "number") return true;
    // exp is in seconds, Date.now() in ms
    return payload.exp * 1000 < Date.now();
  },
};
