import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { useAccount } from "../lib/account-context";
import { TutorialTour, type TourScope } from "./tutorial-tour";
import { AppShellV3 } from "./v3/app-shell-v3";
import { BottomNavV3 } from "./v3/bottom-nav-v3";
import { TopBarV3 } from "./v3/top-bar-v3";

export function AppLayout() {
  const { user, logout, completeTutorial, isAmountsHidden, toggleAmountVisibility } = useAuth();
  const {
    accounts,
    activeAccountId,
    setActiveAccount,
  } = useAccount();

  const navigate = useNavigate();
  const location = useLocation();
  const canSwitchAccount = accounts.some((account) => account.type === "shared");
  const routeSupportsSwitch = location.pathname === "/" || location.pathname.startsWith("/stats");
  const showHeaderAccountSelect = canSwitchAccount && routeSupportsSwitch;
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialScope, setTutorialScope] = useState<TourScope>("month");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível terminar sessão"));
    }
  };

  const scopeFromPath = (path: string): TourScope => (path.startsWith("/stats") ? "stats" : "month");
  const openTutorial = useCallback(() => {
    setTutorialScope(scopeFromPath(location.pathname));
    setTutorialOpen(true);
  }, [location.pathname]);

  const tutorialSessionKey = useCallback(
    (scope: TourScope) => `tutorial_seen_session:${user?.id ?? "anon"}:${scope}`,
    [user?.id],
  );

  useEffect(() => {
    if (!user || tutorialOpen) return;
    if (user.tutorialSeenAt !== null) return;

    const scope = scopeFromPath(location.pathname);
    const alreadySeen = window.sessionStorage.getItem(tutorialSessionKey(scope)) === "1";
    if (alreadySeen) return;

    const timer = window.setTimeout(() => {
      setTutorialScope(scope);
      setTutorialOpen(true);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [location.pathname, tutorialOpen, tutorialSessionKey, user]);

  const closeTutorial = async (_reason: "done" | "skip") => {
    setTutorialOpen(false);
    if (user) {
      window.sessionStorage.setItem(tutorialSessionKey(tutorialScope), "1");
    }
    if (user?.tutorialSeenAt === null) {
      try {
        await completeTutorial();
      } catch {
        // No-op: next login will keep tutorial as unseen if this fails.
      }
    }
  };

  return (
    <AppShellV3>
      <TopBarV3
        appName="Poupérrimo"
        isAmountsHidden={isAmountsHidden}
        onNavigateHome={() => navigate("/")}
        onToggleAmountVisibility={toggleAmountVisibility}
        onOpenTutorial={openTutorial}
        onLogout={() => void handleLogout()}
      />

      {showHeaderAccountSelect ? (
        <div className="-mt-1 bg-background px-4 pb-2">
          <div className="mx-auto w-full max-w-[320px]" data-tour="header-account-select">
            <div className="relative rounded-xl bg-surface-soft/80">
              <select
                value={activeAccountId ?? ""}
                onChange={(event) => setActiveAccount(event.target.value)}
                className="h-11 w-full appearance-none bg-transparent px-4 pr-10 text-center text-sm text-foreground focus-visible:outline-none"
                aria-label="Selecionar conta ativa"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.type === "shared" ? "Partilhada" : "Pessoal"} · {account.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      ) : null}

      <main className="flex-1 bg-background px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]" data-ui-v3-shell="content">
        <Outlet />
      </main>
      <BottomNavV3 />

      <TutorialTour
        open={tutorialOpen}
        scope={tutorialScope}
        showAccountSelectStep={showHeaderAccountSelect}
        onClose={(reason) => {
          void closeTutorial(reason);
        }}
      />
    </AppShellV3>
  );
}
