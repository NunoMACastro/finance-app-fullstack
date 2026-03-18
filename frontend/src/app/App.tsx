import React, { useEffect, useMemo, useState } from "react";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { createAppRouter } from "./routes";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { AccountProvider } from "./lib/account-context";
import { ThemePreferencesProvider } from "./lib/theme-preferences";
import { config } from "./lib/config";
import { AuthPage } from "./components/auth-page";
import { MaintenancePage } from "./components/maintenance-page";
import { Loader2, Smartphone, X } from "lucide-react";

const DESKTOP_NOTICE_STORAGE_KEY = "finance_v2.desktop_notice_dismissed";

function useWideViewport(minWidth = 768): boolean {
  const [isWide, setIsWide] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= minWidth;
  });

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= minWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [minWidth]);

  return isWide;
}

function AppContent() {
  const { isAuthenticated, isInitialising } = useAuth();
  const isWideViewport = useWideViewport();
  const router = useMemo(() => createAppRouter(), []);
  const [noticeDismissed, setNoticeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DESKTOP_NOTICE_STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(DESKTOP_NOTICE_STORAGE_KEY) === "1";
    if (dismissed) {
      setNoticeDismissed(true);
    }
  }, []);

  const showDesktopNotice = isWideViewport && !noticeDismissed;
  const dismissDesktopNotice = () => {
    setNoticeDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DESKTOP_NOTICE_STORAGE_KEY, "1");
    }
  };

  // Show splash while checking for stored tokens
  if (isInitialising) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-page-gradient">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">A carregar...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {showDesktopNotice && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[110] w-[min(92vw,520px)] rounded-xl border border-border bg-card/95 shadow-card backdrop-blur-sm">
            <div className="px-3 py-2.5 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-status-info mt-0.5 shrink-0" />
              <p className="text-xs text-foreground flex-1">
                Esta app está otimizada para telemóvel. Podes continuar no desktop, mas a melhor experiência é no mobile.
              </p>
              <button
                type="button"
                className="p-1 rounded-md text-muted-foreground hover:bg-muted"
                onClick={dismissDesktopNotice}
                aria-label="Fechar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        <AuthPage />
      </>
    );
  }

  return (
    <>
      {showDesktopNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[110] w-[min(92vw,520px)] rounded-xl border border-border bg-card/95 shadow-card backdrop-blur-sm">
          <div className="px-3 py-2.5 flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-status-info mt-0.5 shrink-0" />
            <p className="text-xs text-foreground flex-1">
              Esta app está otimizada para telemóvel. Podes continuar no desktop, mas a melhor experiência é no mobile.
            </p>
            <button
              type="button"
              className="p-1 rounded-md text-muted-foreground hover:bg-muted"
              onClick={dismissDesktopNotice}
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      <RouterProvider router={router} />
    </>
  );
}

export default function App() {
  if (config.maintenanceMode) {
    return <MaintenancePage />;
  }

  return (
    <AuthProvider>
      <ThemePreferencesProvider>
        <AccountProvider>
          <AppContent />
          <Toaster position="top-center" richColors />
          <Analytics />
        </AccountProvider>
      </ThemePreferencesProvider>
    </AuthProvider>
  );
}
