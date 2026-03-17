import type { ReactNode } from "react";
import { cn } from "../ui/utils";
import { UI_V3_CLASS } from "./layout-contracts";

export function PageHeaderV3({
  title,
  subtitle,
  caption,
  leading,
  trailing,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  caption?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        {leading ? (
          <div className="flex items-center gap-2">
            {leading}
            <div className="min-w-0">
              <h2 className={cn("truncate", UI_V3_CLASS.pageTitle)}>{title}</h2>
              {subtitle ? <p className={UI_V3_CLASS.pageSubtitle}>{subtitle}</p> : null}
              {caption ? <p className="text-[11px] text-muted-foreground">{caption}</p> : null}
            </div>
          </div>
        ) : (
          <div>
            <h2 className={UI_V3_CLASS.pageTitle}>{title}</h2>
            {subtitle ? <p className={UI_V3_CLASS.pageSubtitle}>{subtitle}</p> : null}
            {caption ? <p className="text-[11px] text-muted-foreground">{caption}</p> : null}
          </div>
        )}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </header>
  );
}
