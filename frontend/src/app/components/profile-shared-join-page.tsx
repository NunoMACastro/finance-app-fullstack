import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "../lib/account-context";
import { getErrorMessage } from "../lib/api-error";
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
      <section className="space-y-3 border-y border-border/60 py-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Código de convite</label>
          <Input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            className="h-11 rounded-xl uppercase"
          />
        </div>
        <Button
          type="button"
          className="h-11 rounded-xl border-0 bg-brand-gradient text-primary-foreground"
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
