import { Wrench, Clock3 } from "lucide-react";
import { config } from "../lib/config";

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-page-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card/95 backdrop-blur-sm shadow-overlay p-8 sm:p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-card mb-5">
          <Wrench className="w-8 h-8 text-primary-foreground" />
        </div>

        <h1 className="text-2xl text-foreground tracking-tight">{config.maintenanceTitle}</h1>
        <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">{config.maintenanceMessage}</p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-status-info-soft text-status-info px-4 py-2 text-xs sm:text-sm">
          <Clock3 className="w-4 h-4" />
          Serviço temporariamente indisponível
        </div>
      </div>
    </div>
  );
}
