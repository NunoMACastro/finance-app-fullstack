import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const COMPONENTS_DIR = dirname(fileURLToPath(import.meta.url));

function readComponent(relativePath: string): string {
  return readFileSync(join(COMPONENTS_DIR, relativePath), "utf8");
}

function collectRuntimeTsxFiles(dirPath: string, basePath = dirPath): string[] {
  const entries = readdirSync(dirPath);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectRuntimeTsxFiles(fullPath, basePath));
      continue;
    }
    if (!entry.endsWith(".tsx") || entry.endsWith(".test.tsx")) continue;
    files.push(relative(basePath, fullPath));
  }
  return files;
}

describe("UI v3 visual contracts", () => {
  test("primary CTAs do not use rounded-full in target flows", () => {
    const targets = [
      "auth-page.tsx",
      "profile-account-page.tsx",
      "profile-security-page.tsx",
      "profile-preferences-page.tsx",
      "profile-shared-create-page.tsx",
      "profile-shared-join-page.tsx",
      "profile-shared-members-page.tsx",
      "stats-category-insight-sheet.tsx",
    ];
    for (const target of targets) {
      const source = readComponent(target);
      expect(source).not.toContain("rounded-full border-0 bg-primary");
      expect(source).not.toContain("rounded-full bg-danger");
    }
  });

  test("page roots use pageStack contract class", () => {
    const targets = [
      "month-page.tsx",
      "stats-page.tsx",
      "budget-editor-page.tsx",
      "profile-page.tsx",
      "category-movements-page.tsx",
    ];
    for (const target of targets) {
      const source = readComponent(target);
      expect(source).toContain("className={UI_V3_CLASS.pageStack}");
    }
  });

  test("segmented control primitive is used in all key flows", () => {
    const statsSource = readComponent("stats-page.tsx");
    const forecastSource = readComponent("stats-forecast-panel.tsx");
    const monthSource = readComponent("month-page.tsx");
    const budgetSource = readComponent("budget-editor-page.tsx");

    expect(statsSource).toContain("SegmentedControlV3");
    expect(statsSource).toContain('dataTour="stats-period-tabs"');
    expect(forecastSource).toContain("SegmentedControlV3");
    expect(monthSource).toContain("value={type}");
    expect(budgetSource).toContain('value={(category.kind ?? "expense")');

    // Legacy ad-hoc segmented styles removed from these flows.
    expect(statsSource).not.toContain("h-10 rounded-lg px-3 text-sm");
    expect(budgetSource).not.toContain("inline-flex rounded-full bg-muted p-0.5");
    expect(monthSource).not.toContain("flex gap-2 rounded-2xl border border-border bg-surface-soft p-1");
  });

  test("shared header primitive is used in pages with repeated page header pattern", () => {
    const targets = [
      "stats-page.tsx",
      "budget-editor-page.tsx",
      "profile-page.tsx",
      "profile-section-shell.tsx",
      "category-movements-page.tsx",
    ];
    for (const target of targets) {
      const source = readComponent(target);
      expect(source).toContain("PageHeaderV3");
    }
  });

  test("layout contracts expose reusable visual classes", () => {
    const source = readComponent("v3/layout-contracts.ts");
    expect(source).toContain("pageTitle");
    expect(source).toContain("pageSubtitle");
    expect(source).toContain("ctaPrimary");
    expect(source).toContain("ctaSecondary");
    expect(source).toContain("segmentedRoot");
    expect(source).toContain("segmentedItem");
  });

  test("no direct native button usage outside interaction primitives allowlist", () => {
    const allowList = new Set([
      "v3/segmented-control-v3.tsx",
    ]);
    const runtimeFiles = collectRuntimeTsxFiles(COMPONENTS_DIR);

    for (const runtimeFile of runtimeFiles) {
      if (allowList.has(runtimeFile)) continue;
      const source = readComponent(runtimeFile);
      expect(source).not.toContain("<button");
    }
  });

  test("Button controls avoid disallowed radius classes", () => {
    const runtimeFiles = collectRuntimeTsxFiles(COMPONENTS_DIR);
    const disallowedRadiusRegex = /<Button[\s\S]{0,220}(rounded-none|rounded-lg|rounded-2xl)/g;

    for (const runtimeFile of runtimeFiles) {
      const source = readComponent(runtimeFile);
      expect(source).not.toMatch(disallowedRadiusRegex);
    }
  });

  test("primary CTA targets use gradient style", () => {
    const targets = [
      "auth-page.tsx",
      "profile-account-page.tsx",
      "profile-security-page.tsx",
      "profile-preferences-page.tsx",
      "profile-shared-create-page.tsx",
      "profile-shared-join-page.tsx",
      "profile-shared-members-page.tsx",
      "stats-category-insight-sheet.tsx",
    ];
    for (const target of targets) {
      const source = readComponent(target);
      expect(source).toContain("bg-brand-gradient");
      expect(source).not.toContain("rounded-full border-0 bg-primary");
    }
  });
});
