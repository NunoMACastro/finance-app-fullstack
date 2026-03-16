import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Shield, Trash2, UserCog, Users, Palette, X } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { useAccount } from "../lib/account-context";
import { useThemePreferences } from "../lib/theme-preferences";
import { getAccountRoleLabel } from "../lib/account-role-label";
import type { AccountRole, ThemePalette, UserSession } from "../lib/types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const THEME_OPTIONS: Array<{ value: ThemePalette; label: string }> = [
  { value: "brisa", label: "Brisa" },
  { value: "calma", label: "Calma" },
  { value: "aurora", label: "Aurora" },
  { value: "terra", label: "Terra" },
];

const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "BRL", label: "BRL - Real brasileiro" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

const SELECT_CLASS_NAME =
  "h-10 w-full rounded-xl border border-border bg-input-background px-3 text-sm text-foreground";

function formatSessionDate(value: string): string {
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  });
}

export function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    updateProfile,
    updateEmail,
    updatePassword,
    listSessions,
    revokeSession,
    revokeAllSessions,
    removeRevokedSessions,
    resetTutorial,
    exportData,
    deleteMe,
  } = useAuth();
  const {
    accounts,
    activeAccount,
    activeAccountId,
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
  const { theme, setTheme, isSaving: themeSaving } = useThemePreferences();

  const [name, setName] = useState(user?.name ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "EUR");
  const [hideAmountsByDefault, setHideAmountsByDefault] = useState(user?.preferences.hideAmountsByDefault ?? false);

  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [newEmail, setNewEmail] = useState(user?.email ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [newAccountName, setNewAccountName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{
    userId: string;
    name: string;
    email: string;
    role: AccountRole;
    status: "active" | "inactive";
  }>>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [activeTab, setActiveTab] = useState<"account" | "security" | "preferences" | "privacy" | "shared">("account");

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setCurrency(user.currency);
    setNewEmail(user.email);
    setHideAmountsByDefault(user.preferences.hideAmountsByDefault);
  }, [user]);

  const currencyOptions = useMemo(() => {
    if (CURRENCY_OPTIONS.some((option) => option.value === currency)) {
      return CURRENCY_OPTIONS;
    }
    return [{ value: currency, label: `${currency} - Atual` }, ...CURRENCY_OPTIONS];
  }, [currency]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Não foi possível carregar sessões"));
    } finally {
      setSessionsLoading(false);
    }
  }, [listSessions, user]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const canManageMembers = activeAccount?.type === "shared" && activeAccountRole === "owner";

  const loadMembers = async () => {
    if (!activeAccount || !canManageMembers) {
      setMembers([]);
      return;
    }
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

  useEffect(() => {
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccountId, canManageMembers]);

  const activeSessions = useMemo(() => sessions.filter((item) => !item.revokedAt), [sessions]);
  const revokedSessions = useMemo(() => sessions.filter((item) => !!item.revokedAt), [sessions]);

  if (!user) {
    return null;
  }

  const visibleClass = (tab: typeof activeTab) => (activeTab === tab ? "" : "hidden");

  return (
    <div className="space-y-6 pb-6" data-ui-v3-page="profile">
      <div className="flex items-center justify-between">
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <span className="text-xs text-muted-foreground">Perfil e configurações</span>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="h-10 w-full rounded-xl bg-muted p-1">
          <TabsTrigger value="account" className="rounded-lg">Conta</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg">Seg.</TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg">Prefs</TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-lg">Dados</TabsTrigger>
          <TabsTrigger value="shared" className="rounded-lg">Part.</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className={`border-border ${visibleClass("account")}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="w-4 h-4" />
            Conta
          </CardTitle>
          <CardDescription>Dados base de perfil e login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome"
                className="h-10 rounded-xl text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Moeda</label>
              <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={SELECT_CLASS_NAME}>
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            className="rounded-xl bg-brand-gradient text-primary-foreground border-0"
            disabled={savingProfile}
            onClick={async () => {
              setSavingProfile(true);
              try {
                await updateProfile({ name, currency });
                toast.success("Perfil atualizado");
              } catch (error) {
                toast.error(getErrorMessage(error, "Não foi possível atualizar perfil"));
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar perfil"}
          </Button>

          <div className="pt-2 border-t border-border space-y-2">
            <Input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} type="email" placeholder="Novo email" />
            <Input
              value={currentPasswordEmail}
              onChange={(event) => setCurrentPasswordEmail(event.target.value)}
              type="password"
              placeholder="Password atual"
            />
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={savingEmail || !currentPasswordEmail || !newEmail}
              onClick={async () => {
                setSavingEmail(true);
                try {
                  await updateEmail(currentPasswordEmail, newEmail);
                  setCurrentPasswordEmail("");
                  toast.success("Email atualizado");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível atualizar email"));
                } finally {
                  setSavingEmail(false);
                }
              }}
            >
              {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-border ${visibleClass("security")}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            Segurança
          </CardTitle>
          <CardDescription>Password e sessões ativas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              placeholder="Password atual"
            />
            <Input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              placeholder="Nova password"
            />
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={savingPassword || !currentPassword || !newPassword}
            onClick={async () => {
              setSavingPassword(true);
              try {
                await updatePassword(currentPassword, newPassword);
                setCurrentPassword("");
                setNewPassword("");
                toast.success("Password atualizada");
              } catch (error) {
                toast.error(getErrorMessage(error, "Não foi possível atualizar password"));
              } finally {
                setSavingPassword(false);
              }
            }}
          >
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar password"}
          </Button>

          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground">Sessões ({activeSessions.length} ativas)</p>
              <Button variant="ghost" size="sm" onClick={() => void loadSessions()}>Atualizar</Button>
            </div>
            {sessionsLoading ? (
              <p className="text-xs text-muted-foreground">A carregar sessões...</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.jti} className="rounded-xl border border-border bg-card px-3 py-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-foreground">{session.deviceInfo ?? "Dispositivo desconhecido"}</p>
                      {session.revokedAt ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                          title="Remover sessão revogada"
                          onClick={async () => {
                            try {
                              await revokeSession(session.jti);
                              setSessions((previous) => previous.filter((item) => item.jti !== session.jti));
                              toast.success("Sessão removida");
                            } catch (error) {
                              toast.error(getErrorMessage(error, "Não foi possível remover sessão"));
                            }
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">Criada: {formatSessionDate(session.createdAt)}</p>
                    <p className="text-muted-foreground">Expira: {formatSessionDate(session.expiresAt)}</p>
                    {session.revokedAt ? (
                      <p className="text-status-danger">Revogada</p>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 rounded-lg"
                        onClick={async () => {
                          try {
                            await revokeSession(session.jti);
                            await loadSessions();
                            toast.success("Sessão revogada");
                          } catch (error) {
                            toast.error(getErrorMessage(error, "Não foi possível revogar sessão"));
                          }
                        }}
                      >
                        Revogar sessão
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="rounded-xl w-full"
              onClick={async () => {
                try {
                  await revokeAllSessions();
                  await loadSessions();
                  toast.success("Todas as sessões foram revogadas");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível revogar sessões"));
                }
              }}
            >
              Revogar todas as sessões
            </Button>
            <Button
              variant="outline"
              className="rounded-xl w-full"
              disabled={revokedSessions.length === 0}
              onClick={async () => {
                try {
                  await removeRevokedSessions();
                  await loadSessions();
                  toast.success("Sessões revogadas removidas");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível remover sessões revogadas"));
                }
              }}
            >
              Remover sessões revogadas ({revokedSessions.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-border ${visibleClass("preferences")}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4" />
            Preferências
          </CardTitle>
          <CardDescription>Tema, privacidade visual e tutorial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tema</label>
            <select
              value={theme}
              className="h-10 w-full rounded-xl border border-border bg-input-background px-3 text-sm"
              onChange={(event) => {
                void setTheme(event.target.value as ThemePalette);
              }}
              disabled={themeSaving}
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hideAmountsByDefault}
              onChange={(event) => setHideAmountsByDefault(event.target.checked)}
            />
            Ocultar valores por defeito
          </label>

          <Button
            variant="outline"
            className="rounded-xl"
            onClick={async () => {
              try {
                await updateProfile({
                  preferences: {
                    hideAmountsByDefault,
                  },
                });
                toast.success("Preferências atualizadas");
              } catch (error) {
                toast.error(getErrorMessage(error, "Não foi possível atualizar preferências"));
              }
            }}
          >
            Guardar preferências
          </Button>

          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={async () => {
              try {
                await resetTutorial();
                toast.success("Tutorial reiniciado");
              } catch (error) {
                toast.error(getErrorMessage(error, "Não foi possível reiniciar tutorial"));
              }
            }}
          >
            Reset tutorial
          </Button>
        </CardContent>
      </Card>

      <Card className={`border-border ${visibleClass("privacy")}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="w-4 h-4" />
            Dados & Privacidade
          </CardTitle>
          <CardDescription>Exportar dados e desativar conta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="rounded-xl w-full"
            disabled={savingPrivacy}
            onClick={async () => {
              setSavingPrivacy(true);
              try {
                const data = await exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = window.URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `finance-export-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                window.URL.revokeObjectURL(url);
                toast.success("Export concluído");
              } catch (error) {
                toast.error(getErrorMessage(error, "Não foi possível exportar dados"));
              } finally {
                setSavingPrivacy(false);
              }
            }}
          >
            {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Exportar JSON"}
          </Button>

          <div className="rounded-xl border border-destructive/40 bg-status-danger-soft p-3 space-y-2">
            <p className="text-xs text-status-danger">Escreve APAGAR e confirma com password atual para desativar conta.</p>
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value.toUpperCase())}
              placeholder="APAGAR"
            />
            <Input
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              type="password"
              placeholder="Password atual"
            />
            <Button
              className="rounded-xl w-full bg-danger text-danger-foreground hover:bg-danger/90"
              disabled={deleteConfirm !== "APAGAR" || !deletePassword}
              onClick={async () => {
                const confirmed = window.confirm("Tens a certeza que queres desativar a conta?");
                if (!confirmed) return;
                try {
                  await deleteMe(deletePassword);
                  toast.success("Conta desativada");
                  navigate("/");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível desativar conta"));
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Desativar conta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-border ${visibleClass("shared")}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Contas partilhadas
          </CardTitle>
          <CardDescription>Gestão híbrida: também mantida nos atalhos do header.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-border bg-card px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.type} · {getAccountRoleLabel(account.role)}</p>
                </div>
                <Button
                  variant={activeAccountId === account.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setActiveAccount(account.id)}
                >
                  {activeAccountId === account.id ? "Ativa" : "Ativar"}
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              value={newAccountName}
              onChange={(event) => setNewAccountName(event.target.value)}
              placeholder="Nova conta partilhada"
            />
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={!newAccountName.trim()}
              onClick={async () => {
                try {
                  await createSharedAccount(newAccountName);
                  setNewAccountName("");
                  toast.success("Conta partilhada criada");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível criar conta"));
                }
              }}
            >
              Criar
            </Button>
            <Input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Código convite" />
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={!joinCode.trim()}
              onClick={async () => {
                try {
                  await joinByCode(joinCode);
                  setJoinCode("");
                  toast.success("Entraste na conta");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível entrar com código"));
                }
              }}
            >
              Entrar
            </Button>
          </div>

          {activeAccount?.type === "shared" && (
            <Button
              variant="outline"
              className="rounded-xl w-full"
              onClick={async () => {
                const confirmed = window.confirm("Sair da conta partilhada ativa?");
                if (!confirmed) return;
                try {
                  await leaveAccount(activeAccount.id);
                  toast.success("Saíste da conta partilhada");
                } catch (error) {
                  toast.error(getErrorMessage(error, "Não foi possível sair da conta"));
                }
              }}
            >
              Sair da conta ativa
            </Button>
          )}

          {canManageMembers && activeAccount && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground">Membros de {activeAccount.name}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={async () => {
                    try {
                      const next = await generateInviteCode(activeAccount.id);
                      setInviteCode(next.code);
                      toast.success("Código de convite gerado");
                    } catch (error) {
                      toast.error(getErrorMessage(error, "Não foi possível gerar código"));
                    }
                  }}
                >
                  Gerar código
                </Button>
              </div>
              {inviteCode && <p className="text-xs text-muted-foreground">Código atual: {inviteCode}</p>}
              {membersLoading ? (
                <p className="text-xs text-muted-foreground">A carregar membros...</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.userId} className="rounded-lg border border-border px-2 py-2">
                      <p className="text-sm text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <select
                          className="h-9 rounded-lg border border-border bg-input-background px-2 text-xs flex-1"
                          value={member.role}
                          onChange={async (event) => {
                            try {
                              const role = event.target.value as AccountRole;
                              const updated = await updateMemberRole(activeAccount.id, member.userId, role);
                              setMembers((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
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
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            const confirmed = window.confirm(`Remover ${member.name} desta conta?`);
                            if (!confirmed) return;
                            try {
                              await removeMember(activeAccount.id, member.userId);
                              setMembers((prev) => prev.filter((item) => item.userId !== member.userId));
                              toast.success("Membro removido");
                            } catch (error) {
                              toast.error(getErrorMessage(error, "Não foi possível remover membro"));
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
