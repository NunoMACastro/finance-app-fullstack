import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "../lib/account-context";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { getErrorMessage } from "../lib/api-error";
import type { AccountRole } from "../lib/types";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { ProfileSectionShell } from "./profile-section-shell";
import { Button } from "./ui/button";
import { PROFILE_FIELD_LABEL_CLASS, SELECT_CLASS_NAME } from "./profile-options";

export function ProfileSharedMembersPage() {
  const {
    activeAccount,
    activeAccountRole,
    generateInviteCode,
    listMembers,
    updateMemberRole,
    removeMember,
  } = useAccount();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [members, setMembers] = useState<Array<{
    userId: string;
    name: string;
    email: string;
    role: AccountRole;
    status: "active" | "inactive";
  }>>([]);
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState<{ userId: string; name: string } | null>(null);
  const [memberRemoving, setMemberRemoving] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const canManageMembers = activeAccount?.type === "shared" && activeAccountRole === "owner";

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      if (!activeAccount || !canManageMembers) {
        setMembers([]);
        return;
      }
      setMembersLoading(true);
      try {
        const data = await listMembers(activeAccount.id);
        if (!cancelled) {
          setMembers(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Não foi possível carregar membros"));
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    };

    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [activeAccount, canManageMembers, listMembers]);

  return (
    <ProfileSectionShell
      title="Membros e convites"
      description="Gestão de convites e permissões da conta ativa."
      pageId="profile-shared-members"
      backTo="/profile/shared"
    >
      <section className="space-y-2 border-y border-border/60 py-4">
        {!activeAccount || activeAccount.type !== "shared" ? (
          <>
            <p className="text-sm text-foreground">A conta ativa não é partilhada.</p>
            <p className="text-xs text-muted-foreground">Ativa uma conta partilhada para veres membros e convites.</p>
          </>
        ) : !canManageMembers ? (
          <>
            <p className="text-sm text-foreground">Sem permissões para gerir membros.</p>
            <p className="text-xs text-muted-foreground">
              O teu role nesta conta é {getAccountRoleLabel(activeAccountRole ?? activeAccount.role)}.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">Membros de {activeAccount.name}</p>
              <Button
                type="button"
                className="h-12 rounded-xl border-0 bg-primary text-primary-foreground hover:opacity-95"
                disabled={generatingInvite}
                onClick={async () => {
                  setGeneratingInvite(true);
                  try {
                    const next = await generateInviteCode(activeAccount.id);
                    setInviteCode(next.code);
                    toast.success("Código de convite gerado");
                  } catch (error) {
                    toast.error(getErrorMessage(error, "Não foi possível gerar código"));
                  } finally {
                    setGeneratingInvite(false);
                  }
                }}
              >
                {generatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar código"}
              </Button>
            </div>
            {inviteCode ? (
              <p className={PROFILE_FIELD_LABEL_CLASS}>
                Código atual: <span className="font-medium text-foreground">{inviteCode}</span>
              </p>
            ) : null}

            {membersLoading ? (
              <p className="text-xs text-muted-foreground">A carregar membros...</p>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem membros para mostrar.</p>
            ) : (
              <div className="divide-y divide-border/60 border-y border-border/60">
                {members.map((member) => (
                  <div key={member.userId} className="space-y-2 py-3">
                    <p className="truncate text-sm text-foreground">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    <div className="flex items-center gap-2">
                      <select
                        className={`${SELECT_CLASS_NAME} flex-1`}
                        value={member.role}
                        onChange={async (event) => {
                          try {
                            const role = event.target.value as AccountRole;
                            const updated = await updateMemberRole(activeAccount.id, member.userId, role);
                            setMembers((previous) =>
                              previous.map((item) => (item.userId === updated.userId ? updated : item)),
                            );
                            toast.success("Role atualizada");
                          } catch (error) {
                            toast.error(getErrorMessage(error, "Não foi possível atualizar role"));
                          }
                        }}
                      >
                        <option value="owner">{getAccountRoleLabel("owner")}</option>
                        <option value="editor">{getAccountRoleLabel("editor")}</option>
                        <option value="viewer">{getAccountRoleLabel("viewer")}</option>
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-2xl px-3 text-destructive hover:bg-danger-soft"
                        onClick={() => setPendingMemberRemoval({ userId: member.userId, name: member.name })}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmActionDialog
        open={Boolean(pendingMemberRemoval)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingMemberRemoval(null);
        }}
        title="Remover membro?"
        description={
          pendingMemberRemoval
            ? `O membro ${pendingMemberRemoval.name} vai perder acesso a esta conta partilhada.`
            : "Este membro vai perder acesso a esta conta partilhada."
        }
        confirmLabel="Remover"
        loading={memberRemoving}
        onConfirm={async () => {
          if (!activeAccount || !pendingMemberRemoval) return;
          setMemberRemoving(true);
          try {
            await removeMember(activeAccount.id, pendingMemberRemoval.userId);
            setMembers((previous) => previous.filter((item) => item.userId !== pendingMemberRemoval.userId));
            toast.success("Membro removido");
            setPendingMemberRemoval(null);
          } catch (error) {
            toast.error(getErrorMessage(error, "Não foi possível remover membro"));
          } finally {
            setMemberRemoving(false);
          }
        }}
      />
    </ProfileSectionShell>
  );
}
