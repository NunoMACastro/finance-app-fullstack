import { createElement } from "react";
import { createBrowserRouter } from "react-router";
import { RouteErrorBoundary } from "./components/route-error-page";
import { NotFoundPage } from "./components/not-found-page";

export function createAppRoutes() {
  return [
    {
      path: "*",
      Component: NotFoundPage,
    },
    {
      path: "/",
      errorElement: createElement(RouteErrorBoundary),
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
          path: "stats/insights",
          lazy: async () => {
            const mod = await import("./components/stats-insights-page");
            return { Component: mod.StatsInsightsPage };
          },
        },
        {
          path: "recurring/*",
          lazy: async () => {
            const mod = await import("./components/recurring-rules-page");
            return { Component: mod.RecurringRulesPage };
          },
        },
        {
          path: "profile/recurring",
          lazy: async () => {
            const mod = await import("./components/recurring-rules-page");
            return { Component: mod.RecurringRulesPage };
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
        {
          path: "profile/account",
          lazy: async () => {
            const mod = await import("./components/profile-account-page");
            return { Component: mod.ProfileAccountPage };
          },
        },
        {
          path: "profile/security",
          lazy: async () => {
            const mod = await import("./components/profile-security-page");
            return { Component: mod.ProfileSecurityPage };
          },
        },
        {
          path: "profile/preferences",
          lazy: async () => {
            const mod = await import("./components/profile-preferences-page");
            return { Component: mod.ProfilePreferencesPage };
          },
        },
        {
          path: "profile/shared",
          lazy: async () => {
            const mod = await import("./components/profile-shared-page");
            return { Component: mod.ProfileSharedPage };
          },
        },
        {
          path: "profile/shared/accounts",
          lazy: async () => {
            const mod = await import("./components/profile-shared-accounts-page");
            return { Component: mod.ProfileSharedAccountsPage };
          },
        },
        {
          path: "profile/shared/create",
          lazy: async () => {
            const mod = await import("./components/profile-shared-create-page");
            return { Component: mod.ProfileSharedCreatePage };
          },
        },
        {
          path: "profile/shared/join",
          lazy: async () => {
            const mod = await import("./components/profile-shared-join-page");
            return { Component: mod.ProfileSharedJoinPage };
          },
        },
        {
          path: "profile/shared/members",
          lazy: async () => {
            const mod = await import("./components/profile-shared-members-page");
            return { Component: mod.ProfileSharedMembersPage };
          },
        },
        {
          path: "month/:month/category/:categoryId/movements",
          lazy: async () => {
            const mod = await import("./components/category-movements-page");
            return { Component: mod.CategoryMovementsPage };
          },
        },
      ],
    },
  ];
}

export function createAppRouter() {
  return createBrowserRouter(createAppRoutes());
}
