import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";

type StatusTone = "brand" | "info" | "warning" | "danger";

type StatusAction =
  | {
      label: string;
      to: string;
      variant?: "default" | "outline" | "secondary" | "ghost";
    }
  | {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "secondary" | "ghost";
    };

const TONE_STYLES: Record<
  StatusTone,
  {
    shell: string;
    glow: string;
    badge: string;
    icon: string;
    heroText: string;
    separator: string;
  }
> = {
  brand: {
    shell: "bg-brand-gradient",
    glow: "bg-primary-foreground/20",
    badge: "bg-primary-foreground/15 text-primary-foreground",
    icon: "bg-primary-foreground/15 text-primary-foreground",
    heroText: "text-primary-foreground",
    separator: "fill-background stroke-border",
  },
  info: {
    shell: "bg-info-gradient",
    glow: "bg-primary-foreground/20",
    badge: "bg-primary-foreground/15 text-primary-foreground",
    icon: "bg-primary-foreground/15 text-primary-foreground",
    heroText: "text-primary-foreground",
    separator: "fill-background stroke-border",
  },
  warning: {
    shell: "bg-warning-soft",
    glow: "bg-warning/20",
    badge: "bg-warning/20 text-warning-foreground",
    icon: "bg-warning/20 text-warning-foreground",
    heroText: "text-warning-foreground",
    separator: "fill-background stroke-border",
  },
  danger: {
    shell: "bg-danger-gradient",
    glow: "bg-primary-foreground/20",
    badge: "bg-primary-foreground/15 text-primary-foreground",
    icon: "bg-primary-foreground/15 text-primary-foreground",
    heroText: "text-primary-foreground",
    separator: "fill-background stroke-border",
  },
};

export function StatusPage({
  code,
  title,
  description,
  icon: Icon,
  tone = "brand",
  actions = [],
  footer,
  animate = true,
}: {
  code: string;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  tone?: StatusTone;
  actions?: StatusAction[];
  footer?: ReactNode;
  animate?: boolean;
}) {
  const styles = TONE_STYLES[tone];

  const content = (
    <section className="space-y-5 border-y border-border/60 py-5 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {actions.map((action) => {
            const variant = action.variant ?? "default";
            if ("to" in action) {
              return (
                <Button
                  key={action.label}
                  asChild
                  variant={variant}
                  className={cn("w-full sm:w-auto", variant === "default" ? "border-0" : undefined)}
                >
                  <Link to={action.to}>{action.label}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={action.label}
                type="button"
                variant={variant}
                className={cn("w-full sm:w-auto", variant === "default" ? "border-0" : undefined)}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}

      {footer ? <div className="text-xs leading-relaxed text-muted-foreground">{footer}</div> : null}
    </section>
  );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-page-gradient">
      <header className={cn("relative isolate flex min-h-[24svh] items-center justify-center overflow-hidden px-6 pb-12 pt-8 text-center sm:min-h-[26svh]", styles.shell)}>
        <div className={cn("pointer-events-none absolute inset-0 opacity-35", styles.glow)} />
        <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary-foreground/15 blur-3xl" />

        <div className={cn("relative z-10 flex flex-col items-center gap-3", styles.heroText)}>
          <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-full", styles.icon)}>
            <Icon className="h-6 w-6" />
          </div>
          <div className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.2em]", styles.badge)}>
            {code}
          </div>
        </div>

        <svg
          aria-hidden="true"
          viewBox="0 0 390 110"
          preserveAspectRatio="none"
          className={cn("pointer-events-none absolute -bottom-px left-0 h-24 w-full", styles.separator)}
        >
          <path d="M0,64 C96,0 184,118 390,46 L390,110 L0,110 Z" />
          <path d="M0,64 C96,0 184,118 390,46" fill="none" />
        </svg>
      </header>

      <main className="flex-1 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex w-full max-w-md flex-col">
          {animate ? <PageSectionFadeInV3 asChild>{content}</PageSectionFadeInV3> : content}
        </div>
      </main>
    </div>
  );
}

export type { StatusAction, StatusTone };
