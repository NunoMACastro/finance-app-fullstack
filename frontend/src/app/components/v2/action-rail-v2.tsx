import type React from "react";
import { cn } from "../ui/utils";

interface ActionRailV2Props {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}

export function ActionRailV2({ primary, secondary, className }: ActionRailV2Props) {
  return (
    <div className={cn("grid grid-cols-[1fr_auto] items-center gap-2", className)}>
      <div className="min-w-0">{primary}</div>
      {secondary ? <div className="shrink-0">{secondary}</div> : null}
    </div>
  );
}
