import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { UserProfile } from "./types";

const authMocks = vi.hoisted(() => ({
  user: null as UserProfile | null,
  updateProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./auth-context", () => ({
  useAuth: () => ({
    user: authMocks.user,
    updateProfile: authMocks.updateProfile,
  }),
}));

import { ThemePreferencesProvider, useThemePreferences } from "./theme-preferences";

function Probe() {
  const { theme, setTheme } = useThemePreferences();

  return (
    <>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={() => void setTheme("aurora")}>
        set-theme
      </button>
    </>
  );
}

describe("ThemePreferencesProvider", () => {
  beforeEach(() => {
    authMocks.user = null;
    authMocks.updateProfile.mockClear();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-palette");
  });

  test("normalizes aliases from storage and applies theme to documentElement", async () => {
    window.localStorage.setItem("finance_v2.theme_palette", "ocean");

    render(
      <ThemePreferencesProvider>
        <Probe />
      </ThemePreferencesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-value")).toHaveTextContent("brisa");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("brisa");
    expect(window.localStorage.getItem("finance_v2.theme")).toBe("brisa");
    expect(window.localStorage.getItem("finance_v2.theme_palette")).toBeNull();
  });

  test("uses ciano as default fallback when no preference is available", async () => {
    render(
      <ThemePreferencesProvider>
        <Probe />
      </ThemePreferencesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-value")).toHaveTextContent("ciano");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("ciano");
    expect(window.localStorage.getItem("finance_v2.theme")).toBe("ciano");
  });

  test("normalizes all supported legacy aliases from storage", async () => {
    const scenarios = [
      { alias: "ocean", expected: "brisa" },
      { alias: "forest", expected: "terra" },
      { alias: "sunset", expected: "aurora" },
      { alias: "graphite", expected: "calma" },
      { alias: "ambar", expected: "amber" },
      { alias: "invalid-theme", expected: "ciano" },
    ] as const;

    for (const scenario of scenarios) {
      window.localStorage.clear();
      window.localStorage.setItem("finance_v2.theme", scenario.alias);

      const { unmount } = render(
        <ThemePreferencesProvider>
          <Probe />
        </ThemePreferencesProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("theme-value")).toHaveTextContent(scenario.expected);
      });

      unmount();
    }
  });

  test("uses server user preference when authenticated", async () => {
    authMocks.user = {
      id: "u1",
      email: "nuno@example.com",
      name: "Nuno",
      currency: "EUR",
      tutorialSeenAt: null,
      personalAccountId: "acc1",
      preferences: {
        themePalette: "terra",
        hideAmountsByDefault: false,
      },
    };

    render(
      <ThemePreferencesProvider>
        <Probe />
      </ThemePreferencesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-value")).toHaveTextContent("terra");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("terra");
  });

  test("setTheme persists through profile update when user is authenticated", async () => {
    authMocks.user = {
      id: "u1",
      email: "nuno@example.com",
      name: "Nuno",
      currency: "EUR",
      tutorialSeenAt: null,
      personalAccountId: "acc1",
      preferences: {
        themePalette: "brisa",
        hideAmountsByDefault: false,
      },
    };

    render(
      <ThemePreferencesProvider>
        <Probe />
      </ThemePreferencesProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "set-theme" }));

    await waitFor(() => {
      expect(authMocks.updateProfile).toHaveBeenCalledWith({
        preferences: {
          themePalette: "aurora",
        },
      });
    });
  });
});
