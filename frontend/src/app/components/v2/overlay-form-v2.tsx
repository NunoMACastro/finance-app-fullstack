import type React from "react";
import {
  OverlayBody,
  OverlayContent,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "../ui/responsive-overlay";

interface OverlayFormV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function OverlayFormV2({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: OverlayFormV2Props) {
  return (
    <ResponsiveOverlay open={open} onOpenChange={onOpenChange}>
      <OverlayContent density="form" className="bg-card/96">
        <OverlayHeader>
          <OverlayTitle>{title}</OverlayTitle>
        </OverlayHeader>
        <OverlayBody className="pt-0">{children}</OverlayBody>
        {footer ? <OverlayFooter sticky>{footer}</OverlayFooter> : null}
      </OverlayContent>
    </ResponsiveOverlay>
  );
}
