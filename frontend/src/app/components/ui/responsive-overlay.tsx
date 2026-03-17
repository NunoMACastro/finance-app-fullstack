"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { useIsMobile } from "./use-mobile";
import { cn } from "./utils";

type OverlayDensity = "compact" | "form" | "manager";

const densityClassMap: Record<OverlayDensity, string> = {
  compact: "sm:max-w-md",
  form: "sm:max-w-lg",
  manager: "sm:max-w-xl",
};

interface ResponsiveOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  dismissible?: boolean;
}

const OverlayMobileContext = React.createContext<boolean | null>(null);

function useOverlayMode(): boolean {
  const contextValue = React.useContext(OverlayMobileContext);
  const fallbackIsMobile = useIsMobile();
  return contextValue ?? fallbackIsMobile;
}

function ResponsiveOverlay({
  open,
  onOpenChange,
  children,
  dismissible = true,
}: ResponsiveOverlayProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <OverlayMobileContext.Provider value={isMobile}>
        <Sheet
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !dismissible) return;
            onOpenChange(nextOpen);
          }}
        >
          {children}
        </Sheet>
      </OverlayMobileContext.Provider>
    );
  }

  return (
    <OverlayMobileContext.Provider value={isMobile}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    </OverlayMobileContext.Provider>
  );
}

interface OverlayContentProps {
  children: React.ReactNode;
  className?: string;
  density?: OverlayDensity;
  hideClose?: boolean;
}

function OverlayContent({
  children,
  className,
  density = "form",
  hideClose = false,
}: OverlayContentProps) {
  void hideClose;
  const isMobile = useOverlayMode();
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className={cn(
          "right-auto left-1/2 w-[calc(100%-1rem)] max-w-[430px] -translate-x-1/2 max-h-[92vh] rounded-[20px] border border-border/80 bg-card/95 p-0 shadow-overlay backdrop-blur-xl",
          className,
        )}
      >
        {children}
      </SheetContent>
    );
  }

  return (
    <DialogContent
      className={cn(
        "overflow-hidden rounded-[20px] border border-border/80 bg-card/95 p-0 shadow-overlay backdrop-blur-xl",
        densityClassMap[density],
        className,
      )}
    >
      {children}
    </DialogContent>
  );
}

function OverlayHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useOverlayMode();
  if (isMobile) {
    return <SheetHeader className={cn("px-4 pt-3 pb-2 text-left", className)} {...props} />;
  }
  return <DialogHeader className={cn("px-4 pt-4 pb-2 text-left", className)} {...props} />;
}

function OverlayTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useOverlayMode();
  if (isMobile) {
    return <SheetTitle className={cn("text-base text-foreground", className)} {...props} />;
  }
  return <DialogTitle className={cn("text-base text-foreground", className)} {...props} />;
}

function OverlayDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useOverlayMode();
  if (isMobile) {
    return <SheetDescription className={cn("text-xs text-muted-foreground", className)} {...props} />;
  }
  return <DialogDescription className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function OverlayBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-4 pb-4", className)} {...props} />;
}

function OverlayFooter({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"div"> & { sticky?: boolean }) {
  const isMobile = useOverlayMode();
  const baseClass = cn(
    "gap-2",
    sticky
      ? "sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    className,
  );

  if (isMobile) {
    return <SheetFooter className={cn("px-4 pt-3", baseClass)} {...props} />;
  }
  return <DialogFooter className={cn("px-4 pt-3 pb-4 sm:flex-row sm:justify-end", baseClass)} {...props} />;
}

export {
  ResponsiveOverlay,
  OverlayContent,
  OverlayHeader,
  OverlayTitle,
  OverlayDescription,
  OverlayBody,
  OverlayFooter,
};
