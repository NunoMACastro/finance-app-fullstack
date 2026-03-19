import { beforeEach, describe, expect, test, vi } from "vitest";
import { THEME_STORAGE_KEY } from "./app/lib/theme-palette";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

vi.mock("./app/App", () => ({
  default: () => null,
}));

vi.mock("./styles/index.css", () => ({}));

describe("main bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    renderMock.mockReset();
    createRootMock.mockReset();
    createRootMock.mockImplementation(() => ({ render: renderMock }));
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-palette");
    document.body.innerHTML = '<div id="root"></div>';
  });

  test("applies theme before rendering app", async () => {
    const events: string[] = [];
    const originalSetAttribute = document.documentElement.setAttribute.bind(document.documentElement);

    vi.spyOn(document.documentElement, "setAttribute").mockImplementation((name, value) => {
      if (name === "data-theme") {
        events.push(`theme:${value}`);
      }
      return originalSetAttribute(name, value);
    });

    renderMock.mockImplementation(() => {
      events.push("render");
    });
    createRootMock.mockImplementation(() => ({ render: renderMock }));

    window.localStorage.setItem(THEME_STORAGE_KEY, "mare");
    await import("./main");

    expect(events[0]).toBe("theme:mare");
    expect(events).toContain("render");
    expect(events.indexOf("theme:mare")).toBeLessThan(events.indexOf("render"));
  });

  test("falls back to ciano when no stored theme exists", async () => {
    await import("./main");

    expect(document.documentElement.getAttribute("data-theme")).toBe("ciano");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("ciano");
  });
});
