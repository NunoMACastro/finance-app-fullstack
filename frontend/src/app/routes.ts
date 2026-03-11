import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/layout";
import { MonthPage } from "./components/month-page";
import { StatsPage } from "./components/stats-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: MonthPage },
      { path: "stats", Component: StatsPage },
    ],
  },
]);
