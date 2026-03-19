import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const THEMES_DIR = path.resolve(process.cwd(), "src/styles/themes");
const TEMPLATE_FILE = path.join(THEMES_DIR, "_template.css");
const TOKEN_PATTERN = /--t-[a-z0-9-]+\s*:/g;

function getTokenSet(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  return new Set((content.match(TOKEN_PATTERN) ?? []).map((token) => token.replace(/\s*:\s*$/, "")));
}

describe("theme contract", () => {
  test("all runtime themes match the template token set", () => {
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
      const missing = [...required].filter((token) => !themeSet.has(token));
      const extra = [...themeSet].filter((token) => !required.has(token));

      expect(
        { missing, extra },
        `${fileName} should match theme contract exactly`,
      ).toEqual({ missing: [], extra: [] });
    }
  });
});
