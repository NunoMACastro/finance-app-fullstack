import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";

export function ProfileSectionShell({
  title,
  description,
  pageId,
  backTo = "/profile",
  children,
}: {
  title: string;
  description: string;
  pageId: string;
  backTo?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-6" data-ui-v3-page={pageId}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl hover:bg-accent"
          onClick={() => navigate(backTo)}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
