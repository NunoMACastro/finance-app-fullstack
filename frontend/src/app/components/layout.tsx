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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { TutorialTour, type TourScope } from "./tutorial-tour";
import {
  BarChart3,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
  UserPlus,
  Wallet,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Mes" },
  { to: "/stats", icon: BarChart3, label: "Stats" },
];

export function AppLayout() {
  const { user, logout, completeTutorial } = useAuth();
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
      toast.error(getErrorMessage(error, "Nao foi possivel terminar sessao"));
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
      toast.error(getErrorMessage(error, "Nao foi possivel carregar membros"));
    } finally {
      setMembersLoading(false);
    }
  };

  const regenerateCode = async () => {
    if (!activeAccount || activeAccountRole !== "owner") return;
    try {
      const code = await generateInviteCode(activeAccount.id);
      setInviteCode(code.code);
      toast.success("Codigo de convite gerado");
    } catch (error) {
      toast.error(getErrorMessage(error, "Nao foi possivel gerar codigo"));
    }
  };

  const leaveCurrentAccount = async () => {
    if (!activeAccount || activeAccount.type !== "shared") return;
    try {
      await leaveAccount(activeAccount.id);
      setMembersDialogOpen(false);
      toast.success("Saiu da conta partilhada");
    } catch (error) {
      toast.error(getErrorMessage(error, "Nao foi possivel sair da conta"));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[430px] mx-auto w-full">
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur-xl pt-[max(env(safe-area-inset-top),0px)]">
        <div className="max-w-[430px] mx-auto px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-300 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-200/40 shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-foreground text-sm truncate">Poupérrimo</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCreateDialogOpen(true)}
                title="Criar orcamento partilhado"
                className="rounded-xl h-9 w-9"
                data-tour="header-create-shared"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setJoinDialogOpen(true)}
                title="Entrar por codigo de partilha"
                className="rounded-xl h-9 w-9"
                data-tour="header-join-shared"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-100 to-cyan-200 flex items-center justify-center text-xs text-sky-700"
                data-tour="header-profile-badge"
              >
                {initials}
              </div>
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
              className="flex-1 h-10 rounded-xl border border-input bg-white px-3 text-sm min-w-0"
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
              className="text-muted-foreground hover:text-sky-600 rounded-xl h-9 w-9 shrink-0"
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t">
        <div className="max-w-[430px] mx-auto flex items-center justify-around pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-200 ${
                  isActive ? "text-sky-600" : "text-muted-foreground hover:text-foreground"
                }`
              }
              end={item.to === "/"}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-sky-50 rounded-2xl"
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Criar orcamento partilhado</DialogTitle>
          </DialogHeader>
          <Input
            value={newAccountName}
            onChange={(event) => setNewAccountName(event.target.value)}
            placeholder="Ex: Familia Silva"
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  await createSharedAccount(newAccountName);
                  setNewAccountName("");
                  setCreateDialogOpen(false);
                  toast.success("Orcamento partilhado criado");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Nao foi possivel criar conta partilhada"));
                }
              }}
              disabled={!newAccountName.trim()}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Entrar em orcamento partilhado</DialogTitle>
          </DialogHeader>
          <Input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="CODIGO123"
            className="rounded-xl uppercase"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  await joinByCode(joinCode);
                  setJoinCode("");
                  setJoinDialogOpen(false);
                  toast.success("Entrou no orcamento partilhado");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Nao foi possivel entrar com esse codigo"));
                }
              }}
              disabled={!joinCode.trim()}
            >
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Membros do orcamento partilhado</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-stretch gap-2">
            <Button variant="outline" onClick={() => void regenerateCode()}>
              Regenerar codigo
            </Button>
            {inviteCode && (
              <div className="text-xs rounded-xl px-3 py-2 bg-muted/50">Codigo: {inviteCode}</div>
            )}
          </div>

          {membersLoading ? (
            <p className="text-sm text-muted-foreground">A carregar membros...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((member) => (
                <div key={member.userId} className="rounded-xl border p-3 flex flex-col gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-10 rounded-lg border border-input bg-white px-2 text-xs flex-1"
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
                          toast.error(getErrorMessage(error, "Nao foi possivel atualizar a role"));
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
                      className="text-destructive h-10 px-3"
                      onClick={async () => {
                        try {
                          await removeMember(activeAccount!.id, member.userId);
                          setMembers((prev) => prev.filter((item) => item.userId !== member.userId));
                          toast.success("Membro removido");
                        } catch (error) {
                          toast.error(getErrorMessage(error, "Nao foi possivel remover membro"));
                        }
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeAccount?.type === "shared" && (
            <Button variant="outline" className="w-full" onClick={() => void leaveCurrentAccount()}>
              Sair deste orcamento partilhado
            </Button>
          )}
        </DialogContent>
      </Dialog>

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
