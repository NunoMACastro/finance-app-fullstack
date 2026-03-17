import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  CURRENCY_OPTIONS,
  PROFILE_FIELD_GROUP_CLASS,
  PROFILE_FIELD_LABEL_CLASS,
  PROFILE_INPUT_CLASS,
  SELECT_CLASS_NAME,
} from "./profile-options";
import { ProfileSectionShell } from "./profile-section-shell";
import { ConfirmActionDialog } from "./confirm-action-dialog";

export function ProfileAccountPage() {
  const navigate = useNavigate();
  const { user, updateProfile, updateEmail, exportData, deleteMe } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "EUR");
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [currentPasswordEmail, setCurrentPasswordEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setCurrency(user.currency);
    setNewEmail(user.email);
  }, [user]);

  const currencyOptions = useMemo(() => {
    if (CURRENCY_OPTIONS.some((option) => option.value === currency)) {
      return CURRENCY_OPTIONS;
    }
    return [{ value: currency, label: `${currency} - Atual` }, ...CURRENCY_OPTIONS];
  }, [currency]);

  if (!user) return null;

  return (
    <ProfileSectionShell
      title="Conta"
      description="Perfil, email e dados de conta."
      pageId="profile-account"
    >
      <section className="space-y-4 border-y border-border/60 py-4">
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Nome</label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome"
            className={PROFILE_INPUT_CLASS}
          />
        </div>

        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Moeda</label>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className={SELECT_CLASS_NAME}
          >
            {currencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          className="h-12 rounded-xl border-0 bg-primary text-primary-foreground hover:opacity-95"
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
          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar perfil"}
        </Button>
      </section>

      <section className="space-y-4 border-b border-border/60 pb-4">
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Novo email</label>
          <Input
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            type="email"
            placeholder="Novo email"
            className={PROFILE_INPUT_CLASS}
          />
        </div>
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Password atual</label>
          <Input
            value={currentPasswordEmail}
            onChange={(event) => setCurrentPasswordEmail(event.target.value)}
            type="password"
            placeholder="Password atual"
            className={PROFILE_INPUT_CLASS}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-2xl"
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
          {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar email"}
        </Button>
      </section>

      <section className="space-y-3 border-b border-border/60 pb-4">
        <p className={PROFILE_FIELD_LABEL_CLASS}>Dados e privacidade</p>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-2xl"
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
          {savingPrivacy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Exportar JSON"}
        </Button>

        <div className="space-y-3 rounded-2xl border border-danger/40 bg-danger-soft p-3">
          <p className="text-xs text-status-danger">
            Escreve APAGAR e confirma com password atual para desativar conta.
          </p>
          <Input
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value.toUpperCase())}
            placeholder="APAGAR"
            className={PROFILE_INPUT_CLASS}
          />
          <Input
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            type="password"
            placeholder="Password atual"
            className={PROFILE_INPUT_CLASS}
          />
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-danger text-danger-foreground hover:bg-danger/90"
            disabled={deleteConfirm !== "APAGAR" || !deletePassword}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Desativar conta
          </Button>
        </div>
      </section>

      <ConfirmActionDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Desativar conta?"
        description="Esta ação remove o teu acesso e termina a sessão atual."
        confirmLabel="Desativar conta"
        loading={deletingAccount}
        onConfirm={async () => {
          setDeletingAccount(true);
          try {
            await deleteMe(deletePassword);
            toast.success("Conta desativada");
            navigate("/");
          } catch (error) {
            toast.error(getErrorMessage(error, "Não foi possível desativar conta"));
          } finally {
            setDeletingAccount(false);
          }
        }}
      />
    </ProfileSectionShell>
  );
}
