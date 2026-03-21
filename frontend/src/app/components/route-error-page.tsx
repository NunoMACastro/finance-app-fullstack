import { TriangleAlert } from "lucide-react";
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";
import { StatusPage } from "./status-page";
import { ForbiddenPage } from "./forbidden-page";
import { NotFoundPage } from "./not-found-page";

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 403) {
      return (
        <ForbiddenPage
          title="Sem permissões"
          description="A rota pedida existe, mas a conta ativa não tem permissões suficientes para a abrir."
          backTo="/"
        />
      );
    }

    if (error.status === 404) {
      return <NotFoundPage />;
    }
  }

  return <RouteErrorPage error={error} />;
}

export function RouteErrorPage({ error }: { error: unknown }) {
  const navigate = useNavigate();
  const details =
    import.meta.env.DEV && error instanceof Error && error.message.trim() ? error.message : null;

  return (
    <StatusPage
      code="500"
      title="Encontrámos um erro"
      description="A página não conseguiu carregar por causa de um problema inesperado."
      icon={TriangleAlert}
      tone="danger"
      actions={[
        {
          label: "Tentar novamente",
          onClick: () => window.location.reload(),
        },
        {
          label: "Voltar ao início",
          onClick: () => navigate("/"),
          variant: "outline",
        },
      ]}
      footer={details ? `Detalhe: ${details}` : "Se o problema persistir, volta ao início e tenta novamente."}
    />
  );
}
