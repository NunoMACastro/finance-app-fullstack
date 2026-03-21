import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router";
import { StatusPage } from "./status-page";

export function ForbiddenPage({
  title = "Sem permissões",
  description = "Não tens acesso a esta área com a conta ativa atual.",
  backTo,
  homeTo = "/",
  backLabel = "Voltar",
  homeLabel = "Ir para início",
}: {
  title?: string;
  description?: string;
  backTo?: string;
  homeTo?: string;
  backLabel?: string;
  homeLabel?: string;
}) {
  const navigate = useNavigate();

  return (
    <StatusPage
      code="403"
      title={title}
      description={description}
      icon={ShieldAlert}
      tone="danger"
      actions={[
        {
          label: backLabel,
          onClick: () => {
            if (backTo) {
              navigate(backTo);
              return;
            }

            if (window.history.length > 1) {
              navigate(-1);
              return;
            }

            navigate(homeTo);
          },
          variant: "outline",
        },
        {
          label: homeLabel,
          to: homeTo,
        },
      ]}
    />
  );
}
