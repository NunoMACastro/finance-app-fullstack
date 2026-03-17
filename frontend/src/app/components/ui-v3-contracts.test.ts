import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const COMPONENTS_DIR = dirname(fileURLToPath(import.meta.url));

function readComponent(relativePath: string): string {
  return readFileSync(join(COMPONENTS_DIR, relativePath), "utf8");
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
});
