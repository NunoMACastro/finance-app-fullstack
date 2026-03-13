/**
 * Auth Context — manages authentication state.
 *
 * Features:
 *  • On mount, checks tokenStore for existing tokens and fetches user profile
 *  • Listens for `auth:logout` custom events dispatched by http-client on
 *    refresh token failure (401 → forced logout)
 *  • Exposes login / register / logout + isInitialising flag for splash screen
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ExportUserData, ThemePalette, UserProfile, UserSession } from "./types";
import { authApi } from "./api";
import { tokenStore } from "./token-store";
import { config } from "./config";

interface AuthState {
  /** Current user profile, or null if not authenticated */
  user: UserProfile | null;
  /** True when the user is logged in */
  isAuthenticated: boolean;
  /** True during login / register calls */
  isLoading: boolean;
  /** True during initial token rehydration (app start) */
  isInitialising: boolean;
  /** Log in with email + password */
  login: (email: string, password: string) => Promise<void>;
  /** Create a new account */
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Log out and clear tokens */
  logout: () => Promise<void>;
  /** Re-fetch user profile from the backend */
  refreshUser: () => Promise<void>;
  /** Mark tutorial as completed and refresh profile */
  completeTutorial: () => Promise<void>;
  /** Reset tutorial state */
  resetTutorial: () => Promise<void>;
  /** Update user profile/preferences */
  updateProfile: (payload: {
    name?: string;
    currency?: string;
    preferences?: {
      themePalette?: ThemePalette;
      hideAmountsByDefault?: boolean;
    };
  }) => Promise<void>;
  /** Update account email */
  updateEmail: (currentPassword: string, newEmail: string) => Promise<void>;
  /** Update account password */
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** List active/revoked sessions */
  listSessions: () => Promise<UserSession[]>;
  /** Revoke one session by jti */
  revokeSession: (jti: string) => Promise<void>;
  /** Revoke all sessions */
  revokeAllSessions: () => Promise<void>;
  /** Export user data payload */
  exportData: () => Promise<ExportUserData>;
  /** Delete/deactivate the current user account */
  deleteMe: (currentPassword: string) => Promise<void>;
  /** Effective amount masking state (default from user preference + session override) */
  isAmountsHidden: boolean;
  /** Toggle temporary amount visibility in current session */
  toggleAmountVisibility: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [amountsHiddenOverride, setAmountsHiddenOverride] = useState<boolean | null>(null);

  // ── Token rehydration on mount ─────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      // If we have stored tokens, try to fetch user profile
      if (tokenStore.hasTokens() && !tokenStore.isAccessExpired()) {
        try {
          const profile = await authApi.getMe();
          if (!cancelled) setUser(profile);
        } catch {
          // Token invalid or backend unreachable — clear tokens
          tokenStore.clear();
        }
      } else if (tokenStore.hasTokens() && tokenStore.isAccessExpired()) {
        // Access expired but we might have a refresh token
        // The http-client interceptor will auto-refresh on the next request
        // Let's try to fetch the profile — the interceptor handles 401 → refresh
        try {
          const profile = await authApi.getMe();
          if (!cancelled) setUser(profile);
        } catch {
          tokenStore.clear();
        }
      }
      if (!cancelled) setIsInitialising(false);
    }

    // In mock mode, skip rehydration (no real tokens)
    if (config.useMock) {
      setIsInitialising(false);
    } else {
      rehydrate();
    }

    return () => { cancelled = true; };
  }, []);

  // ── Listen for forced logout (from http-client 401 interceptor) ──

  useEffect(() => {
    function handleForcedLogout() {
      setUser(null);
      tokenStore.clear();
    }

    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, []);

  // ── Actions ────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { tokens, user: profile } = await authApi.login(email, password);
      tokenStore.setBoth(tokens.accessToken, tokens.refreshToken);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { tokens, user: profile } = await authApi.register(name, email, password);
      tokenStore.setBoth(tokens.accessToken, tokens.refreshToken);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenStore.getRefresh();
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // Best-effort — clear tokens even if the backend call fails
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch {
      // If profile fetch fails, force logout
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const completeTutorial = useCallback(async () => {
    try {
      const profile = await authApi.completeTutorial();
      setUser(profile);
    } catch {
      // no-op: tutorial completion should not force logout
    }
  }, []);

  const resetTutorial = useCallback(async () => {
    try {
      const profile = await authApi.resetTutorial();
      setUser(profile);
    } catch {
      // no-op
    }
  }, []);

  const updateProfile = useCallback(async (payload: {
    name?: string;
    currency?: string;
    preferences?: {
      themePalette?: ThemePalette;
      hideAmountsByDefault?: boolean;
    };
  }) => {
    const profile = await authApi.updateProfile(payload);
    setUser(profile);
  }, []);

  const updateEmail = useCallback(async (currentPassword: string, newEmail: string) => {
    const profile = await authApi.updateEmail(currentPassword, newEmail);
    setUser(profile);
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authApi.updatePassword(currentPassword, newPassword);
  }, []);

  const listSessions = useCallback(async () => {
    return authApi.listSessions();
  }, []);

  const revokeSession = useCallback(async (jti: string) => {
    await authApi.revokeSession(jti);
  }, []);

  const revokeAllSessions = useCallback(async () => {
    await authApi.revokeAllSessions();
  }, []);

  const exportData = useCallback(async () => {
    return authApi.exportData();
  }, []);

  const deleteMe = useCallback(async (currentPassword: string) => {
    await authApi.deleteMe(currentPassword);
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setAmountsHiddenOverride(null);
  }, [user?.id, user?.preferences.hideAmountsByDefault]);

  const isAmountsHidden = amountsHiddenOverride ?? (user?.preferences.hideAmountsByDefault ?? false);

  const toggleAmountVisibility = useCallback(() => {
    setAmountsHiddenOverride((previous) => {
      const base = previous ?? (user?.preferences.hideAmountsByDefault ?? false);
      return !base;
    });
  }, [user?.preferences.hideAmountsByDefault]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitialising,
        login,
        register,
        logout,
        refreshUser,
        completeTutorial,
        resetTutorial,
        updateProfile,
        updateEmail,
        updatePassword,
        listSessions,
        revokeSession,
        revokeAllSessions,
        exportData,
        deleteMe,
        isAmountsHidden,
        toggleAmountVisibility,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
