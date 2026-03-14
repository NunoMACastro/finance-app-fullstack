import { describe, expect, test } from "vitest";
import {
  normalizeUiVersion,
  parseUiVersion,
  resolveUiVersionFromRuntime,
  UI_VERSION_OVERRIDE_STORAGE_KEY,
} from "./ui-version";

describe("ui version resolver", () => {
  test("parses only supported versions", () => {
    expect(parseUiVersion("v1")).toBe("v1");
    expect(parseUiVersion("v2")).toBe("v2");
    expect(parseUiVersion("V2")).toBeNull();
    expect(parseUiVersion("invalid")).toBeNull();
    expect(parseUiVersion(undefined)).toBeNull();
  });

  test("normalizes value with fallback", () => {
    expect(normalizeUiVersion("v2", "v1")).toBe("v2");
    expect(normalizeUiVersion("unexpected", "v2")).toBe("v2");
  });

  test("query override wins and persists in storage", () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };

    const resolved = resolveUiVersionFromRuntime("v1", new URLSearchParams("ui=v2"), storage);

    expect(resolved).toBe("v2");
    expect(map.get(UI_VERSION_OVERRIDE_STORAGE_KEY)).toBe("v2");
  });

  test("stored override is used when query is missing", () => {
    const storage = {
      getItem: (key: string) => (key === UI_VERSION_OVERRIDE_STORAGE_KEY ? "v2" : null),
      setItem: () => {
        // no-op
      },
    };

    const resolved = resolveUiVersionFromRuntime("v1", new URLSearchParams(""), storage);
    expect(resolved).toBe("v2");
  });
});
