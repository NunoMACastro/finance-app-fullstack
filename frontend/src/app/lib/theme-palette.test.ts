import { describe, expect, test } from "vitest";
import {
  applyThemePaletteToDocument,
  bootstrapThemePalette,
  DEFAULT_THEME_PALETTE,
  normalizeThemePalette,
  readStoredThemePalette,
  THEME_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
} from "./theme-palette";

describe("theme-palette", () => {
  test("normalizes legacy aliases and invalid values", () => {
    expect(normalizeThemePalette("ocean")).toBe("brisa");
    expect(normalizeThemePalette("forest")).toBe("terra");
    expect(normalizeThemePalette("sunset")).toBe("aurora");
    expect(normalizeThemePalette("graphite")).toBe("calma");
    expect(normalizeThemePalette("ambar")).toBe("amber");
    expect(normalizeThemePalette("invalid-theme")).toBe(DEFAULT_THEME_PALETTE);
  });

  test("reads modern key first, then legacy key, then fallback", () => {
    const storage = window.localStorage;
    storage.clear();

    storage.setItem(LEGACY_THEME_STORAGE_KEY, "ocean");
    expect(readStoredThemePalette(storage)).toBe("brisa");

    storage.setItem(THEME_STORAGE_KEY, "mare");
    expect(readStoredThemePalette(storage)).toBe("mare");

    storage.clear();
    expect(readStoredThemePalette(storage)).toBe(DEFAULT_THEME_PALETTE);
  });

  test("applies and persists normalized bootstrap theme", () => {
    const storage = window.localStorage;
    storage.clear();
    storage.setItem(LEGACY_THEME_STORAGE_KEY, "ambar");

    const theme = bootstrapThemePalette(window, document);
    expect(theme).toBe("amber");
    expect(document.documentElement.getAttribute("data-theme")).toBe("amber");
    expect(document.documentElement.getAttribute("data-theme-palette")).toBeNull();
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("amber");
    expect(storage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
  });

  test("can apply theme directly to document", () => {
    applyThemePaletteToDocument(document, "ciano");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ciano");
  });
});
