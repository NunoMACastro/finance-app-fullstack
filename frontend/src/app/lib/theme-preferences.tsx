import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import type { ThemePalette } from "./types";
import {
  applyThemePaletteToDocument,
  DEFAULT_THEME_PALETTE,
  normalizeThemePalette,
  persistThemePalette,
  readStoredThemePalette,
} from "./theme-palette";

interface ThemePreferencesState {
  theme: ThemePalette;
  isSaving: boolean;
  setTheme: (theme: ThemePalette) => Promise<void>;
}

const ThemePreferencesContext = createContext<ThemePreferencesState | null>(null);

function readStoredPalette(): ThemePalette {
  if (typeof window === "undefined") return DEFAULT_THEME_PALETTE;
  return readStoredThemePalette(window.localStorage);
}

export function ThemePreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [fallbackTheme, setFallbackTheme] = useState<ThemePalette>(() => readStoredPalette());

  const theme = normalizeThemePalette(user?.preferences.themePalette ?? fallbackTheme);

  useEffect(() => {
    if (typeof document === "undefined") return;
    applyThemePaletteToDocument(document, theme);
    if (typeof window !== "undefined") {
      persistThemePalette(window.localStorage, theme);
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
