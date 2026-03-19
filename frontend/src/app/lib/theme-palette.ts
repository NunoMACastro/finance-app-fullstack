export const THEME_PALETTES = [
  "brisa",
  "calma",
  "aurora",
  "terra",
  "mare",
  "amber",
  "ciano",
] as const;

export type ThemePalette = (typeof THEME_PALETTES)[number];

export const DEFAULT_THEME_PALETTE: ThemePalette = "ciano";
export const THEME_STORAGE_KEY = "finance_v2.theme";
export const LEGACY_THEME_STORAGE_KEY = "finance_v2.theme_palette";

const THEME_PALETTE_SET = new Set<string>(THEME_PALETTES);

export function normalizeThemePalette(value: string | null | undefined): ThemePalette {
  if (value && THEME_PALETTE_SET.has(value)) {
    return value as ThemePalette;
  }
  if (value === "ocean") return "brisa";
  if (value === "forest") return "terra";
  if (value === "sunset") return "aurora";
  if (value === "graphite") return "calma";
  if (value === "ambar") return "amber";
  return DEFAULT_THEME_PALETTE;
}

export function readStoredThemePalette(storage: Storage): ThemePalette {
  const stored = storage.getItem(THEME_STORAGE_KEY) ?? storage.getItem(LEGACY_THEME_STORAGE_KEY);
  return normalizeThemePalette(stored);
}

export function persistThemePalette(storage: Storage, theme: ThemePalette): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
  storage.removeItem(LEGACY_THEME_STORAGE_KEY);
}

export function applyThemePaletteToDocument(doc: Document, theme: ThemePalette): void {
  doc.documentElement.setAttribute("data-theme", theme);
  doc.documentElement.removeAttribute("data-theme-palette");
}

export function bootstrapThemePalette(windowRef: Window, documentRef: Document): ThemePalette {
  const theme = readStoredThemePalette(windowRef.localStorage);
  applyThemePaletteToDocument(documentRef, theme);
  persistThemePalette(windowRef.localStorage, theme);
  return theme;
}

export const THEME_PALETTE_LABELS: Record<ThemePalette, string> = {
  brisa: "Brisa",
  calma: "Calma",
  aurora: "Aurora",
  terra: "Terra",
  mare: "Maré",
  amber: "Ambar",
  ciano: "Ciano",
};
