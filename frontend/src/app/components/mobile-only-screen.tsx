import { Smartphone } from "lucide-react";

export function MobileOnlyScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-page-gradient">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-status-info-soft flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-status-info" />
        </div>
        <h1 className="text-base text-foreground">App mobile apenas</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Esta aplicação foi otimizada para telemóvel. Abre no telemóvel ou reduz a janela para continuar.
        </p>
      </div>
    </div>
  );
}
