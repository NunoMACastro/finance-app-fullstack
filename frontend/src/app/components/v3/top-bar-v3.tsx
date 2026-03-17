import { CircleHelp, Eye, EyeOff, LogOut, Wallet } from "lucide-react";
import { Button } from "../ui/button";

interface TopBarV3Props {
  appName: string;
  isAmountsHidden: boolean;
  onNavigateHome: () => void;
  onToggleAmountVisibility: () => void;
  onOpenTutorial: () => void;
  onLogout: () => void;
}

export function TopBarV3({
  appName,
  isAmountsHidden,
  onNavigateHome,
  onToggleAmountVisibility,
  onOpenTutorial,
  onLogout,
}: TopBarV3Props) {
  return (
    <header
      className="sticky top-0 z-40 overflow-hidden bg-background pt-[max(env(safe-area-inset-top),0px)]"
      data-ui-v3-shell="topbar"
    >
      <div className="pointer-events-none absolute inset-0 bg-brand-gradient" />
      <div className="pointer-events-none absolute inset-0 bg-brand-gradient-soft opacity-35" />

      <div className="relative px-4 pb-14 pt-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onNavigateHome}
            className="h-11 min-w-0 justify-start gap-2 rounded-xl px-2 py-1 text-primary-foreground/95 hover:bg-primary-foreground/10"
            aria-label="Ir para visão mensal"
          >
            <Wallet className="h-6 w-6 shrink-0 text-primary-foreground" />
            <span className="truncate text-[1.45rem] leading-none tracking-tight">{appName}</span>
          </Button>

          <div className="flex items-center justify-end gap-0.5" data-tour="header-icon-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAmountVisibility}
              title={isAmountsHidden ? "Mostrar valores" : "Ocultar valores"}
              aria-label={isAmountsHidden ? "Mostrar valores" : "Ocultar valores"}
              className="h-11 w-11 rounded-xl bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              data-tour="header-visibility-toggle"
            >
              {isAmountsHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenTutorial}
              aria-label="Abrir tutorial"
              title="Tutorial"
              className="h-11 w-11 rounded-xl bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              data-tour="header-help"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              aria-label="Terminar sessão"
              title="Sair"
              className="h-11 w-11 rounded-xl bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              data-tour="header-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <svg
        aria-hidden="true"
        viewBox="0 0 390 104"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-px left-0 h-16 w-full"
      >
        <path d="M0,72 C84,-6 224,116 390,42 L390,104 L0,104 Z" fill="var(--background)" />
      </svg>
    </header>
  );
}
