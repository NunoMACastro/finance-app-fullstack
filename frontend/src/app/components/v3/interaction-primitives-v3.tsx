import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

type IconActionTone = "normal" | "danger";
type ControlSize = "default" | "compact";

function getControlSizeClass(size: ControlSize): string {
  return size === "compact" ? "h-9" : "h-11";
}

function getIconControlSizeClass(size: ControlSize): string {
  return size === "compact" ? "h-9 w-9" : "h-11 w-11";
}

export function IconActionButtonV3({
  ariaLabel,
  onClick,
  children,
  tone = "normal",
  size = "default",
  disabled = false,
  className,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
  tone?: IconActionTone;
  size?: ControlSize;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        getIconControlSizeClass(size),
        "rounded-xl",
        tone === "danger"
          ? "text-muted-foreground hover:bg-accent hover:text-destructive"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function TextActionButtonV3({
  onClick,
  children,
  size = "default",
  className,
  disabled = false,
}: {
  onClick: () => void;
  children: ReactNode;
  size?: "default" | "sm";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="link"
      className={cn(
        "w-fit rounded-xl px-0 text-left text-primary hover:text-primary/80",
        size === "sm" ? "h-9 text-xs" : "h-11 text-sm",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function RowActionButtonV3({
  onClick,
  leading,
  content,
  trailing,
  dense = false,
  disabled = false,
  className,
}: {
  onClick: () => void;
  leading?: ReactNode;
  content: ReactNode;
  trailing?: ReactNode;
  dense?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full rounded-xl px-2 text-left transition-colors hover:bg-accent/50",
        dense ? "min-h-9 py-2" : "min-h-11 py-3",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">{content}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </Button>
  );
}

export function SelectableTileButtonV3({
  selected,
  onClick,
  title,
  description,
  disabled = false,
  className,
}: {
  selected?: boolean;
  onClick: () => void;
  title: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-auto w-full flex-col items-start justify-start gap-0 rounded-xl border px-3 py-2.5 text-left whitespace-normal",
        selected
          ? "border-primary/60 bg-accent text-foreground hover:bg-accent/80"
          : "border-border bg-surface-soft text-foreground hover:bg-accent",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="block w-full text-left text-sm">{title}</span>
      {description ? (
        <span className="mt-0.5 block w-full text-left text-[10px] leading-tight text-muted-foreground">
          {description}
        </span>
      ) : null}
    </Button>
  );
}

function seriesToneClass(tone: "success" | "danger" | "info"): string {
  if (tone === "success") return "bg-success-soft";
  if (tone === "danger") return "bg-danger-soft";
  return "bg-info-soft";
}

export function SeriesToggleButtonV3({
  active,
  onClick,
  tone,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  tone: "success" | "danger" | "info";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        getControlSizeClass("default"),
        "rounded-xl px-3 text-xs",
        active ? `${seriesToneClass(tone)} text-foreground` : "bg-muted text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
