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

export function ProfileSharedCreatePage() {
  const { createSharedAccount } = useAccount();
  const [newAccountName, setNewAccountName] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  return (
    <ProfileSectionShell
      title="Criar conta partilhada"
      description="Cria uma conta para convidar outros membros."
      pageId="profile-shared-create"
      backTo="/profile/shared"
    >
      <section className="space-y-4 border-y border-border/60 py-4">
        <div className={PROFILE_FIELD_GROUP_CLASS}>
          <label className={PROFILE_FIELD_LABEL_CLASS}>Nome da conta</label>
          <Input
            value={newAccountName}
            onChange={(event) => setNewAccountName(event.target.value)}
            placeholder="Família, Casa, Viagem..."
            className={PROFILE_INPUT_CLASS}
          />
        </div>
        <Button
          type="button"
          className="h-12 rounded-xl border-0 bg-primary text-primary-foreground hover:opacity-95"
          disabled={creatingAccount || !newAccountName.trim()}
          onClick={async () => {
            setCreatingAccount(true);
            try {
              await createSharedAccount(newAccountName);
              setNewAccountName("");
              toast.success("Conta partilhada criada");
            } catch (error) {
              toast.error(getErrorMessage(error, "Não foi possível criar conta"));
            } finally {
              setCreatingAccount(false);
            }
          }}
        >
          {creatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
        </Button>
      </section>
    </ProfileSectionShell>
  );
}
