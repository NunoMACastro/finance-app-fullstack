import { ChevronRight, Palette, Shield, UserCog, Users } from "lucide-react";
import { useNavigate } from "react-router";

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
    <div className="space-y-4 pb-6" data-ui-v3-page="profile">
      <div className="space-y-1">
        <h2 className="text-base text-foreground">Perfil e configurações</h2>
        <p className="text-xs text-muted-foreground">Ajusta a tua conta e preferências num fluxo simples.</p>
      </div>

      <div className="divide-y divide-border/60 border-y border-border/60">
        {PROFILE_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              className="flex min-h-11 w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/50"
              onClick={() => navigate(section.to)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{section.title}</p>
                <p className="truncate text-xs text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
