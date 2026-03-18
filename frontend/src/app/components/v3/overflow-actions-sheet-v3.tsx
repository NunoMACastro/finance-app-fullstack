import { useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import {
  OverlayBody,
  OverlayContent,
  OverlayDescription,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "../ui/responsive-overlay";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { IconActionButtonV3 } from "./interaction-primitives-v3";

export type OverflowActionItemV3 = {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "normal" | "danger";
  disabled?: boolean;
};

export function OverflowActionsSheetV3({
  title = "Mais ações",
  description,
  triggerAriaLabel = "Abrir mais ações",
  actions,
  disabled = false,
}: {
  title?: string;
  description?: string;
  triggerAriaLabel?: string;
  actions: OverflowActionItemV3[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (action: OverflowActionItemV3) => {
    if (action.disabled) return;
    setOpen(false);
    action.onSelect();
  };

  return (
    <>
      <IconActionButtonV3
        ariaLabel={triggerAriaLabel}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Ellipsis className="h-4 w-4" />
      </IconActionButtonV3>

      <ResponsiveOverlay open={open} onOpenChange={setOpen}>
        <OverlayContent density="compact">
          <OverlayHeader>
            <OverlayTitle>{title}</OverlayTitle>
            {description ? <OverlayDescription>{description}</OverlayDescription> : null}
          </OverlayHeader>
          <OverlayBody className="space-y-1 pt-0">
            {actions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant="ghost"
                className={cn(
                  "h-11 w-full justify-start rounded-xl px-3 text-left text-sm",
                  action.tone === "danger"
                    ? "text-danger hover:bg-danger-soft hover:text-danger"
                    : "text-foreground",
                )}
                onClick={() => handleSelect(action)}
                disabled={Boolean(action.disabled)}
              >
                {action.icon ? <span className="shrink-0">{action.icon}</span> : null}
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </OverlayBody>
        </OverlayContent>
      </ResponsiveOverlay>
    </>
  );
}
