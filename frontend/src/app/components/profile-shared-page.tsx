import { ChevronRight, Link2, PlusCircle, Users, UserRoundCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useAccount } from "../lib/account-context";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { ProfileSectionShell } from "./profile-section-shell";
import { RowActionButtonV3 } from "./v3/interaction-primitives-v3";

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
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              )}
              trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            />
          );
        })}
      </section>
    </ProfileSectionShell>
  );
}
