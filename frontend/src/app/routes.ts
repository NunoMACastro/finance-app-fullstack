import { createBrowserRouter } from "react-router";
import type { UiVersion } from "./lib/ui-version";

export function createAppRouter(uiVersion: UiVersion) {
  const isV2 = uiVersion === "v2";

  return createBrowserRouter([
    {
      path: "/",
      lazy: async () => {
        const mod = isV2
          ? await import("./components/layout")
          : await import("./components/layout-v1");
        return { Component: mod.AppLayout };
      },
      children: [
        {
          index: true,
          lazy: async () => {
            const mod = isV2
              ? await import("./components/month-page")
              : await import("./components/month-page-v1");
            return { Component: mod.MonthPage };
          },
        },
        {
          path: "stats",
          lazy: async () => {
            const mod = isV2
              ? await import("./components/stats-page")
              : await import("./components/stats-page-v1");
            return { Component: mod.StatsPage };
          },
        },
        {
          path: "budget/:month/edit",
          lazy: async () => {
            const mod = isV2
              ? await import("./components/budget-editor-page")
              : await import("./components/budget-editor-page-v1");
            return { Component: mod.BudgetEditorPage };
          },
        },
        {
          path: "profile",
          lazy: async () => {
            const mod = isV2
              ? await import("./components/profile-page")
              : await import("./components/profile-page-v1");
            return { Component: mod.ProfilePage };
          },
        },
      ],
    },
  ]);
}
