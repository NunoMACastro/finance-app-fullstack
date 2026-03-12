"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";
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
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          dismissible={dismissible}
          modal
          direction="bottom"
        >
          {children}
        </Drawer>
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
  const isMobile = useOverlayMode();
  if (isMobile) {
    return (
      <DrawerContent
        className={cn(
          "relative border border-sky-100/70 bg-white/95 shadow-[0_-24px_64px_-32px_rgba(14,165,233,0.55)] backdrop-blur-xl rounded-t-3xl max-h-[92vh]",
          className,
        )}
      >
        {!hideClose && (
          <DrawerClose className="absolute top-3 right-3 z-10 rounded-xl p-2 text-muted-foreground hover:bg-sky-50 hover:text-sky-700">
            <XIcon className="w-4 h-4" />
            <span className="sr-only">Fechar</span>
          </DrawerClose>
        )}
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      className={cn(
        "p-0 border border-sky-100/70 bg-white/95 shadow-[0_30px_80px_-34px_rgba(14,165,233,0.5)] backdrop-blur-xl rounded-3xl overflow-hidden",
        densityClassMap[density],
        className,
      )}
    >
      {!hideClose && (
        <DialogClose className="absolute top-3 right-3 z-10 rounded-xl p-2 text-muted-foreground hover:bg-sky-50 hover:text-sky-700">
          <XIcon className="w-4 h-4" />
          <span className="sr-only">Fechar</span>
        </DialogClose>
      )}
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
    return <DrawerHeader className={cn("px-4 pt-2 pb-3 text-left", className)} {...props} />;
  }
  return <DialogHeader className={cn("px-5 pt-5 pb-3 text-left", className)} {...props} />;
}

function OverlayTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useOverlayMode();
  if (isMobile) {
    return <DrawerTitle className={cn("text-base text-foreground", className)} {...props} />;
  }
  return <DialogTitle className={cn("text-base text-foreground", className)} {...props} />;
}

function OverlayDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useOverlayMode();
  if (isMobile) {
    return <DrawerDescription className={cn("text-xs text-muted-foreground", className)} {...props} />;
  }
  return <DialogDescription className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function OverlayBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-4 pb-4 sm:px-5 sm:pb-5", className)} {...props} />;
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
      ? "sticky bottom-0 border-t border-sky-100/70 bg-white/95 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
    className,
  );

  if (isMobile) {
    return <DrawerFooter className={cn("px-4 pt-3", baseClass)} {...props} />;
  }
  return <DialogFooter className={cn("px-5 pt-3 pb-5 sm:flex-row sm:justify-end", baseClass)} {...props} />;
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
