import React, { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { useAccount } from "../lib/account-context";
import { getAccountRoleLabel } from "../lib/account-role-label";
import type { AccountRole } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  OverlayBody,
  OverlayContent,
  OverlayFooter,
  OverlayHeader,
  OverlayTitle,
  ResponsiveOverlay,
} from "./ui/responsive-overlay";
import { TutorialTour, type TourScope } from "./tutorial-tour";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { OverlayFormV2 } from "./v2/overlay-form-v2";
import { AppShellV3 } from "./v3/app-shell-v3";
import { BottomNavV3 } from "./v3/bottom-nav-v3";
import { TopBarV3 } from "./v3/top-bar-v3";
import { OverflowActionsSheetV3 } from "./v3/overflow-actions-sheet-v3";

export function AppLayout() {
  const { user, logout, completeTutorial, isAmountsHidden, toggleAmountVisibility } = useAuth();
  const {
    accounts,
    activeAccountId,
    activeAccount,
    activeAccountRole,
    setActiveAccount,
    createSharedAccount,
    joinByCode,
    generateInviteCode,
    listMembers,
    updateMemberRole,
    removeMember,
    leaveAccount,
  } = useAccount();

  const navigate = useNavigate();
  const location = useLocation();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialScope, setTutorialScope] = useState<TourScope>("month");
  const [overflowSheetOpen, setOverflowSheetOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberRemoving, setMemberRemoving] = useState(false);
  const [leavingAccount, setLeavingAccount] = useState(false);
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [members, setMembers] = useState<Array<{
    userId: string;
    name: string;
    email: string;
    role: AccountRole;
    status: "active" | "inactive";
  }>>([]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível terminar sessão"));
    }
  };

  const scopeFromPath = (path: string): TourScope => (path.startsWith("/stats") ? "stats" : "month");
  const openTutorial = useCallback(() => {
    setOverflowSheetOpen(false);
    setTutorialScope(scopeFromPath(location.pathname));
    setTutorialOpen(true);
  }, [location.pathname]);

  const openCreateSharedAccount = useCallback(() => {
    setCreateDialogOpen(true);
    setOverflowSheetOpen(false);
  }, []);

  const openJoinByCode = useCallback(() => {
    setJoinDialogOpen(true);
    setOverflowSheetOpen(false);
  }, []);

  const openMembersFromOverflow = useCallback(() => {
    setOverflowSheetOpen(false);
    void openMembersManager();
  }, []);

  const tutorialSessionKey = useCallback(
    (scope: TourScope) => `tutorial_seen_session:${user?.id ?? "anon"}:${scope}`,
    [user?.id],
  );

  useEffect(() => {
    if (!user || tutorialOpen) return;
    if (user.tutorialSeenAt !== null) return;

    const scope = scopeFromPath(location.pathname);
    const alreadySeen = window.sessionStorage.getItem(tutorialSessionKey(scope)) === "1";
    if (alreadySeen) return;

    const timer = window.setTimeout(() => {
      setTutorialScope(scope);
      setTutorialOpen(true);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [location.pathname, tutorialOpen, tutorialSessionKey, user]);

  const closeTutorial = async (_reason: "done" | "skip") => {
    setTutorialOpen(false);
    if (user) {
      window.sessionStorage.setItem(tutorialSessionKey(tutorialScope), "1");
    }
    if (user?.tutorialSeenAt === null) {
      try {
        await completeTutorial();
      } catch {
        // No-op: next login will keep tutorial as unseen if this fails.
      }
    }
  };

  const openMembersManager = async () => {
    if (!activeAccount || activeAccount.type !== "shared" || activeAccountRole !== "owner") return;

    setMembersDialogOpen(true);
    setMembersLoading(true);
    try {
      const data = await listMembers(activeAccount.id);
      setMembers(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível carregar membros"));
    } finally {
      setMembersLoading(false);
    }
  };

  const regenerateCode = async () => {
    if (!activeAccount || activeAccountRole !== "owner") return;
    try {
      const code = await generateInviteCode(activeAccount.id);
      setInviteCode(code.code);
      toast.success("Código de convite gerado");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível gerar código"));
    }
  };

  const leaveCurrentAccount = async () => {
    if (!activeAccount || activeAccount.type !== "shared") return;
    try {
      await leaveAccount(activeAccount.id);
      setMembersDialogOpen(false);
      toast.success("Saiu da conta partilhada");
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível sair da conta"));
    }
  };

  const confirmRemoveMember = async () => {
    if (!activeAccount || !pendingMemberRemoval) return;
    setMemberRemoving(true);
    try {
      await removeMember(activeAccount.id, pendingMemberRemoval.userId);
      setMembers((prev) => prev.filter((item) => item.userId !== pendingMemberRemoval.userId));
      toast.success("Membro removido");
      setPendingMemberRemoval(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível remover membro"));
    } finally {
      setMemberRemoving(false);
    }
  };

  const confirmLeaveCurrentAccount = async () => {
    setLeavingAccount(true);
    try {
      await leaveCurrentAccount();
      setConfirmLeaveOpen(false);
    } finally {
      setLeavingAccount(false);
    }
  };

  return (
    <AppShellV3>
      <TopBarV3
        appName="Poupérrimo"
        isAmountsHidden={isAmountsHidden}
        onNavigateHome={() => navigate("/")}
        onToggleAmountVisibility={toggleAmountVisibility}
        onOpenTutorial={openTutorial}
        onLogout={() => void handleLogout()}
      />

      <div className="-mt-1 bg-background px-4 pb-2">
        <div className="mx-auto w-full max-w-[320px]" data-tour="header-account-select">
          <div className="relative rounded-full bg-surface-soft/80">
            <select
              value={activeAccountId ?? ""}
              onChange={(event) => setActiveAccount(event.target.value)}
              className="h-11 w-full appearance-none bg-transparent px-4 pr-10 text-center text-sm text-foreground focus-visible:outline-none"
              aria-label="Selecionar conta ativa"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.type === "shared" ? "Partilhada" : "Pessoal"} · {account.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      <main className="flex-1 bg-background px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]" data-ui-v3-shell="content">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>
      <BottomNavV3 onOpenSharedActions={() => setOverflowSheetOpen(true)} />

      <OverflowActionsSheetV3
        open={overflowSheetOpen}
        onOpenChange={setOverflowSheetOpen}
        onCreateShared={openCreateSharedAccount}
        onJoinByCode={openJoinByCode}
        onOpenMembers={openMembersFromOverflow}
        canManageMembers={activeAccount?.type === "shared" && activeAccountRole === "owner"}
        onOpenTutorial={openTutorial}
        title="Conta partilhada"
        showTutorial={false}
      />

      <OverlayFormV2
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Criar orçamento partilhado"
        footer={(
          <>
            <Button
              variant="outline"
              className="rounded-xl border-border bg-input-background text-foreground hover:bg-accent"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-brand-gradient text-primary-foreground border-0"
              onClick={async () => {
                try {
                  await createSharedAccount(newAccountName);
                  setNewAccountName("");
                  setCreateDialogOpen(false);
                  toast.success("Orçamento partilhado criado");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível criar conta partilhada"));
                }
              }}
              disabled={!newAccountName.trim()}
            >
              Criar
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <Input
            value={newAccountName}
            onChange={(event) => setNewAccountName(event.target.value)}
            placeholder="Ex: Família Silva"
            className="h-11 rounded-xl border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
          />
        </div>
      </OverlayFormV2>

      <OverlayFormV2
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        title="Entrar em orçamento partilhado"
        footer={(
          <>
            <Button
              variant="outline"
              className="rounded-xl border-border bg-input-background text-foreground hover:bg-accent"
              onClick={() => setJoinDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-brand-gradient text-primary-foreground border-0"
              onClick={async () => {
                try {
                  await joinByCode(joinCode);
                  setJoinCode("");
                  setJoinDialogOpen(false);
                  toast.success("Entrou no orçamento partilhado");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível entrar com esse código"));
                }
              }}
              disabled={!joinCode.trim()}
            >
              Entrar
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-4">
          <Input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="CODIGO123"
            className="h-11 rounded-xl uppercase border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
          />
        </div>
      </OverlayFormV2>

      <ResponsiveOverlay open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <OverlayContent density="manager">
          <OverlayHeader>
            <OverlayTitle>Membros do orçamento partilhado</OverlayTitle>
          </OverlayHeader>
          <OverlayBody className="pt-0 flex flex-col gap-3">
            <div className="flex flex-col items-stretch gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-border bg-input-background text-foreground hover:bg-accent"
                onClick={() => void regenerateCode()}
              >
                Regenerar código
              </Button>
              {inviteCode && (
                <div className="text-xs rounded-xl px-3 py-2 border border-border bg-surface-soft text-foreground">
                  Código: {inviteCode}
                </div>
              )}
            </div>

            {membersLoading ? (
              <p className="text-sm text-muted-foreground">A carregar membros...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((member) => (
                  <div key={member.userId} className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="h-10 rounded-lg border border-border bg-input-background px-2 text-xs text-foreground flex-1 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring-soft"
                        value={member.role}
                        onChange={async (event) => {
                          try {
                            const role = event.target.value as AccountRole;
                            const updated = await updateMemberRole(activeAccount!.id, member.userId, role);
                            setMembers((prev) =>
                              prev.map((item) => (item.userId === updated.userId ? updated : item)),
                            );
                            toast.success("Role atualizada");
                          } catch (error) {
                            toast.error(getErrorMessage(error, "Não foi possível atualizar a role"));
                          }
                        }}
                      >
                        <option value="owner">{getAccountRoleLabel("owner")}</option>
                        <option value="editor">{getAccountRoleLabel("editor")}</option>
                        <option value="viewer">{getAccountRoleLabel("viewer")}</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-10 px-3 rounded-lg hover:bg-status-danger-soft"
                        onClick={() =>
                          setPendingMemberRemoval({
                            userId: member.userId,
                            name: member.name,
                          })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeAccount?.type === "shared" && (
              <Button
                variant="outline"
                className="w-full rounded-xl border-border bg-input-background text-foreground hover:bg-accent"
                onClick={() => setConfirmLeaveOpen(true)}
              >
                Sair deste orçamento partilhado
              </Button>
            )}
          </OverlayBody>
        </OverlayContent>
      </ResponsiveOverlay>

      <ConfirmActionDialog
        open={Boolean(pendingMemberRemoval)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingMemberRemoval(null);
          }
        }}
        title="Remover membro?"
        description={
          pendingMemberRemoval
            ? `O membro ${pendingMemberRemoval.name} vai perder acesso a este orçamento partilhado.`
            : "Este membro vai perder acesso a este orçamento partilhado."
        }
        confirmLabel="Remover"
        loading={memberRemoving}
        onConfirm={confirmRemoveMember}
      />

      <ConfirmActionDialog
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        title="Sair desta conta partilhada?"
        description="Vais perder acesso a este orçamento partilhado até voltares a entrar por convite."
        confirmLabel="Sair"
        loading={leavingAccount}
        onConfirm={confirmLeaveCurrentAccount}
      />

      <TutorialTour
        open={tutorialOpen}
        scope={tutorialScope}
        onClose={(reason) => {
          void closeTutorial(reason);
        }}
      />
    </AppShellV3>
  );
}
