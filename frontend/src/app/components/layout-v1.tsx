import React, { useCallback, useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
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
import {
  BarChart3,
  CircleHelp,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
  UserPlus,
  Wallet,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Mês" },
  { to: "/stats", icon: BarChart3, label: "Stats" },
];

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

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const scopeFromPath = (path: string): TourScope => (path.startsWith("/stats") ? "stats" : "month");
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
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto w-full">
      <header className="sticky top-0 z-40 border-b bg-card/70 backdrop-blur-xl pt-[max(env(safe-area-inset-top),0px)]">
        <div className="max-w-[430px] mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-card shrink-0">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-foreground text-sm truncate">Poupérrimo</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCreateDialogOpen(true)}
                title="Criar orçamento partilhado"
                className="rounded-xl h-9 w-9"
                data-tour="header-actions-menu"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setJoinDialogOpen(true)}
                title="Entrar por código de partilha"
                className="rounded-xl h-9 w-9"
                data-tour="header-join-shared"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAmountVisibility}
                title={isAmountsHidden ? "Mostrar valores" : "Ocultar valores"}
                className="rounded-xl h-9 w-9"
                data-tour="header-visibility-toggle"
              >
                {isAmountsHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-brand-gradient-soft flex items-center justify-center text-xs text-foreground"
                data-tour="header-profile-badge"
                aria-label="Abrir perfil"
              >
                {initials}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair"
                className="text-muted-foreground hover:text-destructive rounded-xl h-9 w-9"
                data-tour="header-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeAccountId ?? ""}
              onChange={(event) => setActiveAccount(event.target.value)}
              className="flex-1 h-10 rounded-xl border border-input bg-input-background px-3 text-sm min-w-0"
              data-tour="header-account-select"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {getAccountRoleLabel(account.role)}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTutorialScope(scopeFromPath(location.pathname));
                setTutorialOpen(true);
              }}
              title="Tutorial"
              className="text-muted-foreground hover:text-primary rounded-xl h-9 w-9 shrink-0"
            >
              <CircleHelp className="w-4 h-4" />
            </Button>
            {activeAccount?.type === "shared" && activeAccountRole === "owner" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  void openMembersManager();
                }}
                title="Gerir membros"
                className="rounded-xl h-9 w-9 shrink-0"
              >
                <Users className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-[430px] w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-t">
        <div className="max-w-[430px] mx-auto flex items-center justify-around pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
              end={item.to === "/"}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-accent rounded-2xl"
                      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 relative z-10" />
                  <span className="text-xs relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <ResponsiveOverlay open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <OverlayContent density="compact">
          <OverlayHeader>
            <OverlayTitle>Criar orçamento partilhado</OverlayTitle>
          </OverlayHeader>
          <OverlayBody className="pt-0 flex flex-col gap-4">
            <Input
              value={newAccountName}
              onChange={(event) => setNewAccountName(event.target.value)}
              placeholder="Ex: Família Silva"
              className="h-11 rounded-xl border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
            />
            <OverlayFooter sticky className="px-0 sm:px-0">
              <Button
                variant="outline"
                className="rounded-xl border-border bg-input-background text-foreground hover:bg-accent"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-brand-gradient text-primary-foreground border-0 shadow-card"
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
            </OverlayFooter>
          </OverlayBody>
        </OverlayContent>
      </ResponsiveOverlay>

      <ResponsiveOverlay open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <OverlayContent density="compact">
          <OverlayHeader>
            <OverlayTitle>Entrar em orçamento partilhado</OverlayTitle>
          </OverlayHeader>
          <OverlayBody className="pt-0 flex flex-col gap-4">
            <Input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="CODIGO123"
              className="h-11 rounded-xl uppercase border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring-soft"
            />
            <OverlayFooter sticky className="px-0 sm:px-0">
              <Button
                variant="outline"
                className="rounded-xl border-border bg-input-background text-foreground hover:bg-accent"
                onClick={() => setJoinDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-brand-gradient text-primary-foreground border-0 shadow-card"
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
            </OverlayFooter>
          </OverlayBody>
        </OverlayContent>
      </ResponsiveOverlay>

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
    </div>
  );
}
