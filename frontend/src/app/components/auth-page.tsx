import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Loader2, Wallet } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { isApiError } from "../lib/http-client";
import {
  fetchLoginPatchNotes,
  type LoginPatchNotes,
} from "../lib/login-patch-notes";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TextActionButtonV3 } from "./v3/interaction-primitives-v3";
import { PageSectionFadeInV3 } from "./v3/page-section-fade-in-v3";

export function AuthPage() {
  const { login, register, isLoading } = useAuth();
  const currentYear = new Date().getFullYear();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [error, setError] = useState("");
  const [patchNotes, setPatchNotes] = useState<LoginPatchNotes | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    let isCancelled = false;

    const loadPatchNotes = async () => {
      const notes = await fetchLoginPatchNotes();
      if (isCancelled) return;
      setPatchNotes(notes);
    };

    void loadPatchNotes();

    return () => {
      isCancelled = true;
    };
  }, []);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isApiError(err)) return err.message;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!loginEmail || !loginPassword) {
      setError("Preenche todos os campos");
      return;
    }

    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao iniciar sessão"));
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!regName || !regEmail || !regPassword) {
      setError("Preenche todos os campos");
      return;
    }

    if (regPassword !== regConfirm) {
      setError("As passwords não coincidem");
      return;
    }

    if (regPassword.length < 6) {
      setError("A password deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      await register(regName, regEmail, regPassword);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao criar conta"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageSectionFadeInV3 asChild>
        <header className="relative isolate flex min-h-[28svh] max-h-[34svh] items-center justify-center overflow-hidden bg-brand-gradient px-6 pb-16 pt-10">
          <div className="pointer-events-none absolute inset-0 bg-brand-gradient-soft opacity-40" />
          <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary-foreground/20 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-3 text-primary-foreground">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/20">
              <Wallet className="h-7 w-7" />
            </div>
            <h1 className="text-center text-3xl font-medium tracking-tight">Poupérrimo</h1>
          </div>

          <svg
            data-testid="auth-hero-wave"
            aria-hidden="true"
            viewBox="0 0 390 110"
            preserveAspectRatio="none"
            className="pointer-events-none absolute -bottom-px left-0 h-24 w-full"
          >
            <path
              d="M0,64 C96,0 184,118 390,46 L390,110 L0,110 Z"
              fill="var(--background)"
            />
            <path
              d="M0,64 C96,0 184,118 390,46"
              fill="none"
              stroke="var(--border)"
              strokeWidth="1.25"
            />
          </svg>
        </header>
      </PageSectionFadeInV3>

      <main className="mx-auto flex min-h-[72svh] w-full max-w-md flex-col px-6 pb-8 pt-5">
        <PageSectionFadeInV3 asChild>
          <section>
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="auth-login-email" className="text-sm text-muted-foreground">
                    Email
                  </label>
                  <Input
                    id="auth-login-email"
                    type="email"
                    placeholder="nome@exemplo.pt"
                    className="h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="auth-login-password" className="text-sm text-muted-foreground">
                    Password
                  </label>
                  <Input
                    id="auth-login-password"
                    type="password"
                    placeholder="A tua password"
                    className="h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                  />
                  <p className="pt-1 text-right text-xs text-muted-foreground">
                    Recuperação de password disponível em breve.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-status-danger-soft px-3 py-2 text-sm text-status-danger"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-4 flex flex-col gap-1">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 rounded-xl border-0 bg-brand-gradient text-primary-foreground hover:opacity-95"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Ainda não tens conta?{" "}
                    <TextActionButtonV3
                      size="sm"
                      onClick={() => {
                        setError("");
                        setMode("register");
                      }}
                    >
                      Regista-te
                    </TextActionButtonV3>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="auth-register-name" className="text-sm text-muted-foreground">
                    Nome
                  </label>
                  <Input
                    id="auth-register-name"
                    placeholder="O teu nome"
                    className="h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={regName}
                    onChange={(event) => setRegName(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="auth-register-email" className="text-sm text-muted-foreground">
                    Email
                  </label>
                  <Input
                    id="auth-register-email"
                    type="email"
                    placeholder="nome@exemplo.pt"
                    className="h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30"
                    value={regEmail}
                    onChange={(event) => setRegEmail(event.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-register-password" className="text-sm text-muted-foreground">
                      Password
                    </label>
                    <Input
                      id="auth-register-password"
                      type="password"
                      placeholder="Min. 6 caracteres"
                      className="h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30"
                      value={regPassword}
                      onChange={(event) => setRegPassword(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="auth-register-confirm" className="text-sm text-muted-foreground">
                      Confirmar
                    </label>
                    <Input
                      id="auth-register-confirm"
                      type="password"
                      placeholder="Repete a password"
                      className="h-12 rounded-2xl border-0 bg-surface-soft px-4 text-base placeholder:text-muted-foreground/75 focus-visible:ring-2 focus-visible:ring-ring/30"
                      value={regConfirm}
                      onChange={(event) => setRegConfirm(event.target.value)}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-status-danger-soft px-3 py-2 text-sm text-status-danger"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-4 flex flex-col gap-1">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 rounded-xl border-0 bg-brand-gradient text-primary-foreground hover:opacity-95"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Já tens conta?{" "}
                    <TextActionButtonV3
                      size="sm"
                      onClick={() => {
                        setError("");
                        setMode("login");
                      }}
                    >
                      Entrar
                    </TextActionButtonV3>
                  </p>
                </div>
              </form>
            )}
          </section>
        </PageSectionFadeInV3>

        {patchNotes && (
          <PageSectionFadeInV3 asChild>
            <aside
              className="mt-auto pt-7 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/85">
                Notas {patchNotes.version}
              </p>
              {patchNotes.updatedAt && (
                <p className="mt-1 text-[11px] text-muted-foreground">{patchNotes.updatedAt}</p>
              )}
              {patchNotes.changes.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {patchNotes.changes.slice(0, 3).map((item, index) => (
                    <li key={`${item}-${index}`} className="text-muted-foreground">
                      - {item}
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </PageSectionFadeInV3>
        )}

        <div className="flex justify-center pt-8">
          <div className="group relative inline-flex items-center gap-1.5 text-xs text-muted-foreground/85">
            <span>made with</span>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Nuno Castro ${currentYear}`}
              className="h-8 w-8 rounded-xl p-0 text-status-danger transition-colors hover:bg-transparent hover:opacity-80"
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
            </Button>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap px-2 py-1 text-[11px] text-muted-foreground opacity-0 transition-all duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
              Nuno Castro · {currentYear}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
