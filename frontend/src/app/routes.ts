import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const mod = await import("./components/layout");
      return { Component: mod.AppLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const mod = await import("./components/month-page");
          return { Component: mod.MonthPage };
        },
      },
      {
        path: "stats",
        lazy: async () => {
          const mod = await import("./components/stats-page");
          return { Component: mod.StatsPage };
        },
      },
      {
        path: "budget/:month/edit",
        lazy: async () => {
          const mod = await import("./components/budget-editor-page");
          return { Component: mod.BudgetEditorPage };
        },
      },
      {
        path: "profile",
        lazy: async () => {
          const mod = await import("./components/profile-page");
          return { Component: mod.ProfilePage };
        },
      },
    ],
  },
]);
