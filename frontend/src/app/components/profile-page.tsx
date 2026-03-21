import { ChevronRight, Palette, Repeat, Shield, UserCog, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeaderV3 } from "./v3/page-header-v3";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";
import { RowActionButtonV3 } from "./v3/interaction-primitives-v3";
import { UI_V3_CLASS } from "./v3/layout-contracts";

const PROFILE_SECTIONS = [
  {
    id: "account",
    title: "Conta",
    description: "Perfil, email, exportação e privacidade",
    to: "/profile/account",
    icon: UserCog,
  },
  {
    id: "security",
    title: "Segurança",
    description: "Password e sessões",
    to: "/profile/security",
    icon: Shield,
  },
  {
    id: "preferences",
    title: "Preferências",
    description: "Tema, privacidade visual e tutorial",
    to: "/profile/preferences",
    icon: Palette,
  },
  {
    id: "recurring",
    title: "Recorrências",
    description: "Regras automáticas de receitas e despesas",
    to: "/profile/recurring",
    icon: Repeat,
  },
  {
    id: "shared",
    title: "Conta partilhada",
    description: "Hub de colaboração, convites e membros",
    to: "/profile/shared",
    icon: Users,
  },
] as const;

export function ProfilePage() {
  const navigate = useNavigate();

  return (
    <div className={UI_V3_CLASS.pageStack} data-ui-v3-page="profile">
      <PageHeaderV3
        title="Perfil e configurações"
        subtitle="Ajusta a tua conta e preferências num fluxo simples."
      />

      <PageSectionFadeInV3 asChild>
        <div className="divide-y divide-border/60 border-y border-border/60">
          {PROFILE_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <RowActionButtonV3
                key={section.id}
                onClick={() => navigate(section.to)}
                className="px-0"
                leading={(
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                )}
                content={(
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{section.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{section.description}</p>
                  </div>
                )}
                trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
              />
            );
          })}
        </div>
      </PageSectionFadeInV3>
    </div>
  );
}
