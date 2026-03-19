import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const THEMES_DIR = path.resolve(process.cwd(), "src/styles/themes");
const TEMPLATE_FILE = path.join(THEMES_DIR, "_template.css");
const TOKEN_PATTERN = /--t-[a-z0-9-]+\s*:/g;
const OPTIONAL_GRADIENT_TOKENS = new Set([
  "--t-gradient-page",
  "--t-gradient-brand",
  "--t-gradient-brand-soft",
  "--t-gradient-info",
  "--t-gradient-danger",
  ...Array.from({ length: 9 }, (_, index) => `--t-category-gradient-${index + 1}`),
]);

function getTokenSet(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  return new Set((content.match(TOKEN_PATTERN) ?? []).map((token) => token.replace(/\s*:\s*$/, "")));
}

function validateTokenSet(tokens: Set<string>, required: Set<string>) {
  const missing = [...required].filter((token) => !tokens.has(token));
  const extra = [...tokens].filter((token) => !required.has(token) && !OPTIONAL_GRADIENT_TOKENS.has(token));
  return { missing, extra };
}

describe("theme contract", () => {
  test("all runtime themes satisfy required tokens and allowed optional gradients", () => {
    const required = getTokenSet(TEMPLATE_FILE);
    const themeFiles = fs
      .readdirSync(THEMES_DIR)
      .filter((file) => file.endsWith(".css") && file !== "_template.css")
      .sort();

    expect(themeFiles).toEqual([
      "amber.css",
      "aurora.css",
      "brisa.css",
      "calma.css",
      "ciano.css",
      "mare.css",
      "terra.css",
    ]);

    for (const fileName of themeFiles) {
      const themeSet = getTokenSet(path.join(THEMES_DIR, fileName));
      const { missing, extra } = validateTokenSet(themeSet, required);

      expect(
        { missing, extra },
        `${fileName} should satisfy required tokens and allowed optional gradients`,
      ).toEqual({ missing: [], extra: [] });
    }
  });

  test("theme without optional gradient tokens passes", () => {
    const required = getTokenSet(TEMPLATE_FILE);
    const simulatedThemeWithoutGradients = new Set(required);
    const { missing, extra } = validateTokenSet(simulatedThemeWithoutGradients, required);
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  test("theme with unknown token fails", () => {
    const required = getTokenSet(TEMPLATE_FILE);
    const simulatedTheme = new Set(required);
    simulatedTheme.add("--t-unknown-token");
    const { missing, extra } = validateTokenSet(simulatedTheme, required);
    expect(missing).toEqual([]);
    expect(extra).toEqual(["--t-unknown-token"]);
  });

  test("theme missing required token fails", () => {
    const required = getTokenSet(TEMPLATE_FILE);
    const simulatedTheme = new Set(required);
    simulatedTheme.delete("--t-background");
    const { missing, extra } = validateTokenSet(simulatedTheme, required);
    expect(missing).toContain("--t-background");
    expect(extra).toEqual([]);
  });
});
