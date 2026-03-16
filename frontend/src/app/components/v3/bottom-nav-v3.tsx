import { BarChart3, LayoutDashboard, UserRound, UsersRound } from "lucide-react";
import { NavLink } from "react-router";

const monthTab = { to: "/", label: "Mês" } as const;
const statsTab = { to: "/stats", label: "Stats" } as const;
const profileTab = { to: "/profile", label: "Perfil" } as const;

interface BottomNavV3Props {
  onOpenSharedActions: () => void;
}

export function BottomNavV3({ onOpenSharedActions }: BottomNavV3Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-card/95"
      aria-label="Navegação principal"
      data-ui-v3-shell="bottom-nav"
    >
      <div className="mx-auto grid max-w-[430px] grid-cols-4 items-center gap-1 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <NavLink
          to={monthTab.to}
          end
          className={({ isActive }) =>
            `relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <LayoutDashboard className="h-5 w-5" />
              <span>{monthTab.label}</span>
              <span
                className={`h-0.5 w-5 rounded-full transition-opacity ${isActive ? "bg-primary opacity-100" : "opacity-0"}`}
                aria-hidden
              />
            </>
          )}
        </NavLink>

        <button
          type="button"
          onClick={onOpenSharedActions}
          className="relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Abrir ações partilhadas"
          title="Ações partilhadas"
          data-tour="bottom-shared-actions"
        >
          <UsersRound className="h-5 w-5" />
          <span>Partilhar</span>
          <span className="h-0.5 w-5 rounded-full opacity-0" aria-hidden />
        </button>

        <NavLink
          to={statsTab.to}
          end={false}
          className={({ isActive }) =>
            `relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <BarChart3 className="h-5 w-5" />
              <span>{statsTab.label}</span>
              <span
                className={`h-0.5 w-5 rounded-full transition-opacity ${isActive ? "bg-primary opacity-100" : "opacity-0"}`}
                aria-hidden
              />
            </>
          )}
        </NavLink>

        <NavLink
          to={profileTab.to}
          end={false}
          className={({ isActive }) =>
            `relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`
          }
          data-tour="bottom-profile-nav"
        >
          {({ isActive }) => (
            <>
              <UserRound className="h-5 w-5" />
              <span>{profileTab.label}</span>
              <span
                className={`h-0.5 w-5 rounded-full transition-opacity ${isActive ? "bg-primary opacity-100" : "opacity-0"}`}
                aria-hidden
              />
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
