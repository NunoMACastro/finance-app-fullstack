import { Clock3 } from "lucide-react";
import { config } from "../lib/config";
import { StatusPage } from "./status-page";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";

export function MaintenancePage() {
  return (
    <PageSectionFadeInV3 asChild>
      <StatusPage
        code="503"
        title={config.maintenanceTitle}
        description={config.maintenanceMessage}
        icon={Clock3}
        tone="info"
        footer="Serviço temporariamente indisponível."
        animate={false}
      />
    </PageSectionFadeInV3>
  );
}
