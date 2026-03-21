import { describe, expect, test } from "vitest";
import { matchRoutes } from "react-router";
import { createAppRoutes } from "./routes";

describe("App routes", () => {
  test("registers a catch-all route and a root error boundary", () => {
    const routes = createAppRoutes();
    const matches = matchRoutes(routes as any, "/rota-que-nao-existe");

    expect(routes.find((route) => route.path === "/")?.errorElement).toBeTruthy();
    expect(matches?.[matches.length - 1]?.route.path).toBe("*");
  });
});
