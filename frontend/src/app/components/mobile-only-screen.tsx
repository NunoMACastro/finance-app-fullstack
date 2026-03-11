import { Smartphone } from "lucide-react";

export function MobileOnlyScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-sky-50 to-cyan-50">
      <div className="w-full max-w-sm rounded-2xl border border-sky-100 bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-sky-600" />
        </div>
        <h1 className="text-base text-foreground">App mobile apenas</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Esta aplicacao foi otimizada para telemovel. Abre no telemovel ou reduz a janela para continuar.
        </p>
      </div>
    </div>
  );
}
