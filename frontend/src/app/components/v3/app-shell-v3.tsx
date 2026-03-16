import type React from "react";
import { cn } from "../ui/utils";

interface AppShellV3Props {
  children: React.ReactNode;
  className?: string;
}

export function AppShellV3({ children, className }: AppShellV3Props) {
  return (
    <div className={cn("relative min-h-screen overflow-x-hidden bg-page-gradient", className)} data-ui-v3-shell="app">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col">{children}</div>
    </div>
  );
}
