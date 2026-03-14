import type React from "react";
import { cn } from "../ui/utils";

interface PageShellV2Props {
  children: React.ReactNode;
  className?: string;
}

export function PageShellV2({ children, className }: PageShellV2Props) {
  return (
    <div className={cn("relative min-h-screen overflow-x-hidden bg-page-gradient", className)}>
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-brand-gradient-soft opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-64 h-72 w-72 rounded-full bg-info-gradient opacity-35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-[70%] -translate-x-1/2 rounded-full bg-brand-gradient-soft opacity-35 blur-3xl" />
      <div className="relative mx-auto min-h-screen w-full max-w-[430px]">{children}</div>
    </div>
  );
}
