import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth-context";
import { useAccount } from "../lib/account-context";
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
    role: "owner" | "editor" | "viewer";
    status: "active" | "inactive";
  }>>([]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
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

  useEffect(() => {
    if (!user || tutorialOpen) return;

    const scope = scopeFromPath(location.pathname);
    const storageKey = `tutorial_seen:${user.id}:${scope}`;
    const alreadySeen = window.localStorage.getItem(storageKey) === "1";
    if (alreadySeen) return;

    const timer = window.setTimeout(() => {
      setTutorialScope(scope);
      setTutorialOpen(true);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [location.pathname, tutorialOpen, user]);

  const closeTutorial = async () => {
    setTutorialOpen(false);
    if (user) {
      const storageKey = `tutorial_seen:${user.id}:${tutorialScope}`;
      window.localStorage.setItem(storageKey, "1");
    }
    if (user?.tutorialSeenAt === null) {
      await completeTutorial();
    }
  };

  const openMembersManager = async () => {
    if (!activeAccount || activeAccount.type !== "shared" || activeAccountRole !== "owner") return;

    setMembersDialogOpen(true);
    setMembersLoading(true);
    try {
      const data = await listMembers(activeAccount.id);
      setMembers(data);
    } finally {
      setMembersLoading(false);
    }
  };

  const regenerateCode = async () => {
    if (!activeAccount || activeAccountRole !== "owner") return;
    const code = await generateInviteCode(activeAccount.id);
    setInviteCode(code.code);
  };

  const leaveCurrentAccount = async () => {
    if (!activeAccount || activeAccount.type !== "shared") return;
    await leaveAccount(activeAccount.id);
    setMembersDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-300 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-200/40">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-foreground text-sm">Poupérrimo</span>
            </div>
          </div>

          <div className="flex-1 max-w-[260px]">
            <select
              value={activeAccountId ?? ""}
              onChange={(event) => setActiveAccount(event.target.value)}
              className="w-full h-9 rounded-xl border border-input bg-white px-3 text-xs"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCreateDialogOpen(true)}
              title="Criar conta partilhada"
              className="rounded-xl"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setJoinDialogOpen(true)}
              title="Entrar por codigo"
              className="rounded-xl"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            {activeAccount?.type === "shared" && activeAccountRole === "owner" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  void openMembersManager();
                }}
                title="Membros"
                className="rounded-xl"
              >
                <Users className="w-4 h-4" />
              </Button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-100 to-cyan-200 flex items-center justify-center text-xs text-sky-700">
              {initials}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTutorialScope(scopeFromPath(location.pathname));
                setTutorialOpen(true);
              }}
              title="Tutorial"
              className="text-muted-foreground hover:text-sky-600 rounded-xl"
            >
              <CircleHelp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-muted-foreground hover:text-destructive rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-24 max-w-3xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t">
        <div className="max-w-3xl mx-auto flex items-center justify-around py-1.5 px-2">
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
            <DialogTitle>Criar conta partilhada</DialogTitle>
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
                await createSharedAccount(newAccountName);
                setNewAccountName("");
                setCreateDialogOpen(false);
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
            <DialogTitle>Entrar por codigo</DialogTitle>
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
                await joinByCode(joinCode);
                setJoinCode("");
                setJoinDialogOpen(false);
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
            <DialogTitle>Membros da conta</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
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
                <div key={member.userId} className="rounded-xl border p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <select
                    className="h-8 rounded-lg border border-input bg-white px-2 text-xs"
                    value={member.role}
                    onChange={async (event) => {
                      const role = event.target.value as "owner" | "editor" | "viewer";
                      const updated = await updateMemberRole(activeAccount!.id, member.userId, role);
                      setMembers((prev) =>
                        prev.map((item) => (item.userId === updated.userId ? updated : item)),
                      );
                    }}
                  >
                    <option value="owner">owner</option>
                    <option value="editor">editor</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      await removeMember(activeAccount!.id, member.userId);
                      setMembers((prev) => prev.filter((item) => item.userId !== member.userId));
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeAccount?.type === "shared" && (
            <Button variant="outline" className="w-full" onClick={() => void leaveCurrentAccount()}>
              Sair desta conta
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <TutorialTour
        open={tutorialOpen}
        scope={tutorialScope}
        onClose={() => {
          void closeTutorial();
        }}
      />
    </div>
  );
}
