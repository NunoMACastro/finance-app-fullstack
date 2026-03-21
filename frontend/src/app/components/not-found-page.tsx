import { SearchX } from "lucide-react";
import { StatusPage } from "./status-page";

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      title="Página não encontrada"
      description="O endereço que procuraste não existe ou deixou de estar disponível."
      icon={SearchX}
      tone="warning"
      actions={[
        {
          label: "Voltar ao início",
          to: "/",
        },
      ]}
    />
  );
}
