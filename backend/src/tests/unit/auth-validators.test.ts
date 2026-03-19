import { describe, expect, test } from "vitest";
import { ZodError } from "zod";
import { updateProfileSchema } from "../../modules/auth/validators.js";

describe("auth validators", () => {
  test("accepts all supported theme palette IDs", () => {
    const supported = ["brisa", "calma", "aurora", "terra", "mare", "amber", "ciano"] as const;

    for (const themePalette of supported) {
      const parsed = updateProfileSchema.parse({
        preferences: { themePalette },
      });
      expect(parsed.preferences?.themePalette).toBe(themePalette);
    }
  });

  test("normalizes legacy `ambar` to canonical `amber`", () => {
    const parsed = updateProfileSchema.parse({
      preferences: { themePalette: "ambar" },
    });

    expect(parsed.preferences?.themePalette).toBe("amber");
  });

  test("rejects invalid theme palette values", () => {
    expect(() =>
      updateProfileSchema.parse({
        preferences: { themePalette: "invalid-theme" },
      }),
    ).toThrow(ZodError);
  });
});
