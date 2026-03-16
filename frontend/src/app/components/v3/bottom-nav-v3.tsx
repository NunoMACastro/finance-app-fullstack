import { BarChart3, LayoutDashboard, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";

const monthTab = { to: "/", label: "Mês" } as const;
const statsTab = { to: "/stats", label: "Stats" } as const;
const profileTab = { to: "/profile", label: "Perfil" } as const;

export function BottomNavV3() {
  const location = useLocation();
  const pathname = location.pathname;
  const isMonthActive = pathname === "/";
  const isStatsActive = pathname.startsWith("/stats");
  const isProfileActive = pathname.startsWith("/profile");

  const tabClass = (isActive: boolean) =>
    `relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-card/95"
      aria-label="Navegação principal"
      data-ui-v3-shell="bottom-nav"
    >
      <div className="mx-auto grid max-w-[430px] grid-cols-3 items-center gap-1 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <Link to={monthTab.to} className={tabClass(isMonthActive)}>
          <LayoutDashboard className="h-5 w-5" />
          <span>{monthTab.label}</span>
          <span
            className={`h-0.5 w-5 rounded-full transition-opacity ${isMonthActive ? "bg-primary opacity-100" : "opacity-0"}`}
            aria-hidden
          />
        </Link>

        <Link to={statsTab.to} className={tabClass(isStatsActive)}>
          <BarChart3 className="h-5 w-5" />
          <span>{statsTab.label}</span>
          <span
            className={`h-0.5 w-5 rounded-full transition-opacity ${isStatsActive ? "bg-primary opacity-100" : "opacity-0"}`}
            aria-hidden
          />
        </Link>

        <Link
          to={profileTab.to}
          className={tabClass(isProfileActive)}
          data-tour="bottom-profile-nav"
        >
          <UserRound className="h-5 w-5" />
          <span>{profileTab.label}</span>
          <span
            className={`h-0.5 w-5 rounded-full transition-opacity ${isProfileActive ? "bg-primary opacity-100" : "opacity-0"}`}
            aria-hidden
          />
        </Link>
      </div>
    </nav>
  );
}
