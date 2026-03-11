import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth-context";
import { Button } from "./ui/button";
import {
  LayoutDashboard,
  BarChart3,
  LogOut,
  Wallet,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Mes" },
  { to: "/stats", icon: BarChart3, label: "Stats" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-300 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-200/40">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-foreground text-sm">Poupérrimo</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-100 to-cyan-200 flex items-center justify-center text-xs text-sky-700">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm text-muted-foreground">{user?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-muted-foreground hover:text-destructive rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-5 pb-24 max-w-3xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          key={undefined}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t">
        <div className="max-w-3xl mx-auto flex items-center justify-around py-1.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? "text-sky-600"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
              end={item.to === "/"}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-sky-50 rounded-2xl"
                      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                    />
                  )}
                  <item.icon className="w-5 h-5 relative z-10" />
                  <span className="text-xs relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
