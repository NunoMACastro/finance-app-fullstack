import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "../lib/account-context";
import { getErrorMessage } from "../lib/api-error";
import {
  PROFILE_FIELD_GROUP_CLASS,
  PROFILE_FIELD_LABEL_CLASS,
  PROFILE_INPUT_CLASS,
} from "./profile-options";
import { ProfileSectionShell } from "./profile-section-shell";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function ProfileSharedJoinPage() {
  const { joinByCode } = useAccount();
  const [joinCode, setJoinCode] = useState("");
  const [joiningAccount, setJoiningAccount] = useState(false);

  return (
    <ProfileSectionShell
      title="Entrar por código"
      description="Introduz um convite para aceder a uma conta partilhada."
      pageId="profile-shared-join"
      backTo="/profile/shared"
    >
      <section className="space-y-4 border-y border-border/60 py-4">
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Código de convite</label>
          <Input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            className={`${PROFILE_INPUT_CLASS} uppercase`}
          />
        </div>
        <Button
          type="button"
          className="h-12 rounded-xl border-0 bg-brand-gradient text-primary-foreground hover:opacity-95"
          disabled={joiningAccount || !joinCode.trim()}
          onClick={async () => {
            setJoiningAccount(true);
            try {
              await joinByCode(joinCode);
              setJoinCode("");
              toast.success("Entraste na conta");
            } catch (error) {
              toast.error(getErrorMessage(error, "Não foi possível entrar com código"));
            } finally {
              setJoiningAccount(false);
            }
          }}
        >
          {joiningAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
        </Button>
      </section>
    </ProfileSectionShell>
  );
}
