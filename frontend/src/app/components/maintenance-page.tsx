import { Wrench, Clock3 } from "lucide-react";
import { config } from "../lib/config";

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),transparent_55%),linear-gradient(160deg,#f8fafc,#e0f2fe)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-sky-100 bg-white/90 backdrop-blur-sm shadow-xl shadow-sky-100/50 p-8 sm:p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-300 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-200/60 mb-5">
          <Wrench className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl text-slate-800 tracking-tight">{config.maintenanceTitle}</h1>
        <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">{config.maintenanceMessage}</p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-sky-50 text-sky-700 px-4 py-2 text-xs sm:text-sm">
          <Clock3 className="w-4 h-4" />
          Servico temporariamente indisponivel
        </div>
      </div>
    </div>
  );
}
