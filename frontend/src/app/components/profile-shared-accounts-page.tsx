import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "../lib/account-context";
import { getAccountRoleLabel } from "../lib/account-role-label";
import { getErrorMessage } from "../lib/api-error";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { PROFILE_FIELD_LABEL_CLASS } from "./profile-options";
import { ProfileSectionShell } from "./profile-section-shell";
import { Button } from "./ui/button";

export function ProfileSharedAccountsPage() {
  const { accounts, activeAccount, activeAccountId, setActiveAccount, leaveAccount } = useAccount();
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [leavingAccount, setLeavingAccount] = useState(false);

  return (
    <ProfileSectionShell
      title="Contas e contexto ativo"
      description="Troca de conta ativa e saída da conta partilhada."
      pageId="profile-shared-accounts"
      backTo="/profile/shared"
    >
      <section className="space-y-2 border-y border-border/60 py-4">
        <p className={PROFILE_FIELD_LABEL_CLASS}>Contas disponíveis</p>
        <div className="divide-y divide-border/60 border-y border-border/60">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {account.type === "shared" ? "Partilhada" : "Pessoal"} · {getAccountRoleLabel(account.role)}
                </p>
              </div>
              <Button
                type="button"
                variant={activeAccountId === account.id ? "default" : "outline"}
                className={`h-12 rounded-2xl px-3 ${activeAccountId === account.id ? "border-0 bg-primary text-primary-foreground hover:opacity-95" : ""}`}
                onClick={() => setActiveAccount(account.id)}
              >
                {activeAccountId === account.id ? "Ativa" : "Ativar"}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {activeAccount?.type === "shared" ? (
        <section className="border-b border-border/60 pb-4">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl text-destructive hover:bg-danger-soft"
            onClick={() => setConfirmLeaveOpen(true)}
          >
            Sair da conta ativa
          </Button>
        </section>
      ) : null}

      <ConfirmActionDialog
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        title="Sair da conta partilhada?"
        description="Vais perder acesso a esta conta até voltares a entrar por convite."
        confirmLabel="Sair"
        loading={leavingAccount}
        onConfirm={async () => {
          if (!activeAccount || activeAccount.type !== "shared") return;
          setLeavingAccount(true);
          try {
            await leaveAccount(activeAccount.id);
            setConfirmLeaveOpen(false);
            toast.success("Saíste da conta partilhada");
          } catch (error) {
            toast.error(getErrorMessage(error, "Não foi possível sair da conta"));
          } finally {
            setLeavingAccount(false);
          }
        }}
      />
    </ProfileSectionShell>
  );
}
