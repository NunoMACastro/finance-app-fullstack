import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import type { ThemePalette } from "./types";

const STORAGE_KEY = "finance_v2.theme";
const LEGACY_STORAGE_KEY = "finance_v2.theme_palette";
const DEFAULT_PALETTE: ThemePalette = "brisa";

interface ThemePreferencesState {
  theme: ThemePalette;
  isSaving: boolean;
  setTheme: (theme: ThemePalette) => Promise<void>;
}

const ThemePreferencesContext = createContext<ThemePreferencesState | null>(null);

function normalizeThemePalette(value: string | null | undefined): ThemePalette {
  if (value === "brisa" || value === "calma" || value === "aurora" || value === "terra") {
    return value;
  }
  if (value === "ocean") return "brisa";
  if (value === "forest") return "terra";
  if (value === "sunset") return "aurora";
  if (value === "graphite") return "calma";
  return DEFAULT_PALETTE;
}

function readStoredPalette(): ThemePalette {
  if (typeof window === "undefined") return DEFAULT_PALETTE;
  const value = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return normalizeThemePalette(value);
}

export function ThemePreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [fallbackTheme, setFallbackTheme] = useState<ThemePalette>(() => readStoredPalette());

  const theme = normalizeThemePalette(user?.preferences.themePalette ?? fallbackTheme);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.removeAttribute("data-theme-palette");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }, [theme]);

  const setTheme = useCallback(
    async (nextTheme: ThemePalette) => {
      if (!user) {
        setFallbackTheme(nextTheme);
        return;
      }
      setIsSaving(true);
      try {
        await updateProfile({ preferences: { themePalette: nextTheme } });
      } finally {
        setIsSaving(false);
      }
    },
    [updateProfile, user],
  );

  const value = useMemo(
    () => ({
      theme,
      isSaving,
      setTheme,
    }),
    [isSaving, setTheme, theme],
  );

  return <ThemePreferencesContext.Provider value={value}>{children}</ThemePreferencesContext.Provider>;
}

export function useThemePreferences() {
  const context = useContext(ThemePreferencesContext);
  if (!context) {
    throw new Error("useThemePreferences must be used within ThemePreferencesProvider");
  }
  return context;
}
