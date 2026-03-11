import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { AccountProvider } from "./lib/account-context";
import { config } from "./lib/config";
import { AuthPage } from "./components/auth-page";
import { MaintenancePage } from "./components/maintenance-page";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { isAuthenticated, isInitialising } = useAuth();

  // Show splash while checking for stored tokens
  if (isInitialising) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-sky-50 to-cyan-50">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-sm text-muted-foreground">A carregar...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  if (config.maintenanceMode) {
    return <MaintenancePage />;
  }

  return (
    <AuthProvider>
      <AccountProvider>
        <AppContent />
      </AccountProvider>
    </AuthProvider>
  );
}
