import { useCallback, useEffect, useMemo, useState } from "react";
import { Laptop, Loader2, RefreshCw, ShieldCheck, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import type { UserSession } from "../lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  formatSessionDate,
  PROFILE_FIELD_GROUP_CLASS,
  PROFILE_FIELD_LABEL_CLASS,
  PROFILE_INPUT_CLASS,
} from "./profile-options";
import { ProfileSectionShell } from "./profile-section-shell";

export function ProfileSecurityPage() {
  const {
    user,
    updatePassword,
    listSessions,
    revokeSession,
    revokeAllSessions,
    removeRevokedSessions,
  } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

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

  const activeSessions = useMemo(() => sessions.filter((item) => !item.revokedAt), [sessions]);
  const revokedSessions = useMemo(() => sessions.filter((item) => Boolean(item.revokedAt)), [sessions]);

  const resolveDeviceIcon = (deviceInfo: string | null) => {
    const value = (deviceInfo ?? "").toLowerCase();
    if (value.includes("iphone") || value.includes("android") || value.includes("mobile")) {
      return Smartphone;
    }
    return Laptop;
  };

  if (!user) return null;

  return (
    <ProfileSectionShell
      title="Segurança"
      description="Password e sessões ativas."
      pageId="profile-security"
    >
      <section className="space-y-4 border-y border-border/60 py-4">
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Password atual</label>
          <Input
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            type="password"
            placeholder="Password atual"
            className={PROFILE_INPUT_CLASS}
          />
        </div>
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Nova password</label>
          <Input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            placeholder="Nova password"
            className={PROFILE_INPUT_CLASS}
          />
        </div>
        <Button
          type="button"
          className="h-12 rounded-xl border-0 bg-primary text-primary-foreground hover:opacity-95"
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
          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar password"}
        </Button>
      </section>

      <section className="space-y-3 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">Sessões ({activeSessions.length} ativas)</p>
          <Button type="button" variant="ghost" className="h-12 rounded-2xl px-3" onClick={() => void loadSessions()}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {sessionsLoading ? (
          <p className="text-xs text-muted-foreground">A carregar sessões...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem sessões para mostrar.</p>
        ) : (
          <div className="divide-y divide-border/60 border-y border-border/60">
            {sessions.map((session) => {
              const DeviceIcon = resolveDeviceIcon(session.deviceInfo);

              return (
                <div key={session.jti} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        <DeviceIcon className="mr-1.5 inline h-4 w-4 text-muted-foreground" />
                        {session.deviceInfo ?? "Dispositivo desconhecido"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Criada {formatSessionDate(session.createdAt)} · Expira {formatSessionDate(session.expiresAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] ${
                        session.revokedAt
                          ? "bg-danger-soft text-status-danger"
                          : "bg-success-soft text-status-success"
                      }`}
                    >
                      {session.revokedAt ? "Revogada" : "Ativa"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {session.revokedAt ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          try {
                            await revokeSession(session.jti);
                            setSessions((previous) => previous.filter((item) => item.jti !== session.jti));
                            toast.success("Sessão removida");
                          } catch (error) {
                            toast.error(getErrorMessage(error, "Não foi possível remover sessão"));
                          }
                        }}
                        aria-label="Remover sessão revogada"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-2xl px-3 text-xs"
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
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl"
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
            <ShieldCheck className="h-4 w-4" />
            Revogar todas as sessões
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl"
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
      </section>
    </ProfileSectionShell>
  );
}
