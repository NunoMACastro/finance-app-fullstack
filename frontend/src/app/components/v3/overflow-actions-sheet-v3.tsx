import type React from "react";
import { BadgePlus, CircleHelp, UserPlus, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

interface OverflowActionsSheetV3Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateShared: () => void;
  onJoinByCode: () => void;
  onOpenTutorial: () => void;
  onOpenMembers?: () => void;
  canManageMembers?: boolean;
  title?: string;
  showTutorial?: boolean;
}

function ActionButton({
  label,
  onClick,
  icon,
  dataTour,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  dataTour?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left text-sm text-foreground"
      data-tour={dataTour}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function OverflowActionsSheetV3({
  open,
  onOpenChange,
  onCreateShared,
  onJoinByCode,
  onOpenTutorial,
  onOpenMembers,
  canManageMembers,
  title = "Ações rápidas",
  showTutorial = true,
}: OverflowActionsSheetV3Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] border-border bg-card p-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-describedby={undefined}
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4 pb-3" data-ui-v3-shell="overflow-sheet">
          <ActionButton
            label="Criar conta partilhada"
            onClick={onCreateShared}
            icon={<BadgePlus className="h-4 w-4" />}
            dataTour="header-create-shared"
          />
          <ActionButton
            label="Entrar por código"
            onClick={onJoinByCode}
            icon={<UserPlus className="h-4 w-4" />}
            dataTour="header-join-shared"
          />
          {canManageMembers && onOpenMembers ? (
            <ActionButton
              label="Gerir membros"
              onClick={onOpenMembers}
              icon={<Users className="h-4 w-4" />}
            />
          ) : null}
          {showTutorial ? (
            <ActionButton
              label="Tutorial"
              onClick={onOpenTutorial}
              icon={<CircleHelp className="h-4 w-4" />}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
