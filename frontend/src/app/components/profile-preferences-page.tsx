import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { getErrorMessage } from "../lib/api-error";
import { useThemePreferences } from "../lib/theme-preferences";
import type { ThemePalette } from "../lib/types";
import { Button } from "./ui/button";
import {
  PROFILE_FIELD_GROUP_CLASS,
  PROFILE_FIELD_LABEL_CLASS,
  SELECT_CLASS_NAME,
  THEME_OPTIONS,
} from "./profile-options";
import { ProfileSectionShell } from "./profile-section-shell";
import { Switch } from "./ui/switch";

export function ProfilePreferencesPage() {
  const { user, updateProfile, resetTutorial } = useAuth();
  const { theme, setTheme, isSaving: themeSaving } = useThemePreferences();
  const [hideAmountsByDefault, setHideAmountsByDefault] = useState(user?.preferences.hideAmountsByDefault ?? false);

  useEffect(() => {
    if (!user) return;
    setHideAmountsByDefault(user.preferences.hideAmountsByDefault);
  }, [user]);

  if (!user) return null;

  return (
    <ProfileSectionShell
      title="Preferências"
      description="Tema, privacidade visual e tutorial."
      pageId="profile-preferences"
    >
      <section className="space-y-4 border-y border-border/60 py-4">
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Tema</label>
          <select
            value={theme}
            className={SELECT_CLASS_NAME}
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

        <label className="flex h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border-0 bg-surface-soft px-4">
          <div className="min-w-0">
            <p className="text-sm text-foreground">Ocultar valores por defeito</p>
            <p className="text-xs text-muted-foreground">Aplica-se automaticamente ao entrar na app.</p>
          </div>
          <Switch
            checked={hideAmountsByDefault}
            onCheckedChange={setHideAmountsByDefault}
            aria-label="Ocultar valores por defeito"
          />
        </label>

        <Button
          type="button"
          className="h-12 rounded-xl border-0 bg-primary text-primary-foreground hover:opacity-95"
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
      </section>

      <section className="border-b border-border/60 pb-4">
        <Button
          type="button"
          variant="ghost"
          className="h-12 rounded-2xl text-muted-foreground hover:bg-accent hover:text-foreground"
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
      </section>
    </ProfileSectionShell>
  );
}
