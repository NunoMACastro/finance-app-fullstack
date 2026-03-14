import type React from "react";
import { cn } from "../ui/utils";

interface EmptyStateV2Props {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateV2({ title, description, icon, action, className }: EmptyStateV2Props) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border/70 bg-surface-soft/70 px-4 py-6 text-center", className)}>
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 text-muted-foreground">{icon}</div> : null}
      <p className="text-sm text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
