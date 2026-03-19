import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { THEME_OPTIONS } from "../components/profile-options";
import { THEME_PALETTES, THEME_PALETTE_LABELS } from "./theme-palette";

const THEMES_DIR = path.resolve(process.cwd(), "src/styles/themes");

describe("theme palette contract", () => {
  test("runtime theme files match supported theme IDs", () => {
    const runtimeThemeIds = fs
      .readdirSync(THEMES_DIR)
      .filter((file) => file.endsWith(".css") && file !== "_template.css")
      .map((file) => file.replace(/\.css$/, ""))
      .sort();

    expect(runtimeThemeIds).toEqual([...THEME_PALETTES].sort());
  });

  test("profile theme selector matches supported IDs and labels", () => {
    const optionValues = THEME_OPTIONS.map((option) => option.value);
    expect(optionValues).toEqual([...THEME_PALETTES]);

    for (const option of THEME_OPTIONS) {
      expect(option.label).toBe(THEME_PALETTE_LABELS[option.value]);
    }
  });
});
