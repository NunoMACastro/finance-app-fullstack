import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

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
    <div className={UI_V3_CLASS.pageStack} data-ui-v3-page={pageId}>
      <PageHeaderV3
        title={title}
        subtitle={description}
        leading={(
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl hover:bg-accent"
            onClick={() => navigate(backTo)}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      />
      {children}
    </div>
  );
}
