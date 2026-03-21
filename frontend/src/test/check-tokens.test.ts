import path from "node:path";
import { describe, expect, test } from "vitest";
import { shouldCheckTokenFile } from "../../scripts/check-tokens-core.js";

function resolveSrcPath(...segments: string[]): string {
  return path.resolve(process.cwd(), "src", ...segments);
}

const themesDir = path.resolve(process.cwd(), "src", "styles", "themes");

describe("check-tokens guardrail", () => {
  test("scans supported files under src/imports and ignores markdown by extension", () => {
    expect(shouldCheckTokenFile(resolveSrcPath("imports", "example.tsx"), { themesDir })).toBe(true);
    expect(shouldCheckTokenFile(resolveSrcPath("imports", "reference.md"), { themesDir })).toBe(false);
  });

  test("keeps theme runtime files excluded from the token scan", () => {
    expect(shouldCheckTokenFile(resolveSrcPath("styles", "themes", "brisa.css"), { themesDir })).toBe(false);
  });
});
