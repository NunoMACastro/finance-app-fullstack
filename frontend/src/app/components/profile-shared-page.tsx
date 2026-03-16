import { ChevronRight, Link2, PlusCircle, Users, UserRoundCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useAccount } from "../lib/account-context";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { ProfileSectionShell } from "./profile-section-shell";

const SHARED_SECTIONS = [
  {
    id: "accounts",
    title: "Contas e contexto ativo",
    description: "Trocar conta ativa e sair da conta partilhada atual.",
    to: "/profile/shared/accounts",
    icon: UserRoundCheck,
  },
  {
    id: "create",
    title: "Criar conta partilhada",
    description: "Criar uma nova conta para colaboração.",
    to: "/profile/shared/create",
    icon: PlusCircle,
  },
  {
    id: "join",
    title: "Entrar por código",
    description: "Junta-te a uma conta existente com convite.",
    to: "/profile/shared/join",
    icon: Link2,
  },
  {
    id: "members",
    title: "Membros e convites",
    description: "Gerir membros e gerar código de convite.",
    to: "/profile/shared/members",
    icon: Users,
  },
] as const;

export function ProfileSharedPage() {
  const navigate = useNavigate();
  const { activeAccount, activeAccountRole } = useAccount();

  return (
    <ProfileSectionShell
      title="Conta partilhada"
      description="Gestão de colaboração em subpáginas dedicadas."
      pageId="profile-shared-hub"
    >
      <section className="space-y-1 border-y border-border/60 py-4">
        <p className="text-xs text-muted-foreground">Conta ativa</p>
        <p className="text-sm text-foreground">
          {activeAccount ? `${activeAccount.name} · ${getAccountRoleLabel(activeAccountRole ?? activeAccount.role)}` : "Sem conta ativa"}
        </p>
      </section>

      <section className="divide-y divide-border/60 border-b border-border/60">
        {SHARED_SECTIONS.map((section) => {
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
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </section>
    </ProfileSectionShell>
  );
}
