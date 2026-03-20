/**
 * Auth Context — manages authentication state.
 *
 * Features:
 *  • Rehydrates on mount by exchanging the refresh cookie for a short-lived access token
 *  • Keeps the access token only in memory
 *  • Syncs login/logout/session revocation across tabs
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ExportUserData, ThemePalette, UserProfile, UserSession } from "./types";
import { authApi } from "./api";
import { tokenStore } from "./token-store";

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
  /** Remove all revoked sessions from history */
  removeRevokedSessions: () => Promise<void>;
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
const AUTH_BROADCAST_CHANNEL = "finance-v2-auth";
type AuthBroadcastMessage = { type: "login" | "logout" | "session-revoked" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialising, setIsInitialising] = useState(true);
  const [amountsHiddenOverride, setAmountsHiddenOverride] = useState<boolean | null>(null);

  const publishAuthEvent = useCallback((message: AuthBroadcastMessage) => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  }, []);

  const clearLocalSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const { accessToken } = await authApi.refresh();
      tokenStore.setAccess(accessToken);
      const profile = await authApi.getMe();
      setUser(profile);
      return profile;
    } catch {
      clearLocalSession();
      return null;
    }
  }, [clearLocalSession]);

  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      if (tokenStore.hasTokens() && !tokenStore.isAccessExpired()) {
        try {
          const profile = await authApi.getMe();
          if (!cancelled) setUser(profile);
        } catch {
          if (!cancelled) {
            await refreshSession();
          }
        }
      } else {
        await refreshSession();
      }
      if (!cancelled) setIsInitialising(false);
    }

    rehydrate();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleForcedLogout() {
      clearLocalSession();
    }

    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [clearLocalSession]);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return undefined;
    }

    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data.type === "login") {
        void refreshSession();
        return;
      }

      clearLocalSession();
    };

    return () => {
      channel.close();
    };
  }, [clearLocalSession, refreshSession]);

  // ── Actions ────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { accessToken, user: profile } = await authApi.login(email, password);
      tokenStore.setAccess(accessToken);
      setUser(profile);
      publishAuthEvent({ type: "login" });
    } finally {
      setIsLoading(false);
    }
  }, [publishAuthEvent]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { accessToken, user: profile } = await authApi.register(name, email, password);
      tokenStore.setAccess(accessToken);
      setUser(profile);
      publishAuthEvent({ type: "login" });
    } finally {
      setIsLoading(false);
    }
  }, [publishAuthEvent]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort — clear local auth even if the backend call fails
    }
    clearLocalSession();
    publishAuthEvent({ type: "logout" });
  }, [clearLocalSession, publishAuthEvent]);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch {
      await refreshSession();
    }
  }, [refreshSession]);

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
    clearLocalSession();
    publishAuthEvent({ type: "session-revoked" });
  }, [clearLocalSession, publishAuthEvent]);

  const listSessions = useCallback(async () => {
    return authApi.listSessions();
  }, []);

  const revokeSession = useCallback(async (jti: string) => {
    await authApi.revokeSession(jti);
  }, []);

  const revokeAllSessions = useCallback(async () => {
    await authApi.revokeAllSessions();
    clearLocalSession();
    publishAuthEvent({ type: "session-revoked" });
  }, [clearLocalSession, publishAuthEvent]);

  const removeRevokedSessions = useCallback(async () => {
    await authApi.removeRevokedSessions();
  }, []);

  const exportData = useCallback(async () => {
    return authApi.exportData();
  }, []);

  const deleteMe = useCallback(async (currentPassword: string) => {
    await authApi.deleteMe(currentPassword);
    clearLocalSession();
    publishAuthEvent({ type: "logout" });
  }, [clearLocalSession, publishAuthEvent]);

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
        removeRevokedSessions,
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
