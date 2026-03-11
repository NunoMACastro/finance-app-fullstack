import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/auth-context";
import { isApiError } from "../lib/http-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Wallet, Loader2, Mail, Lock, UserCircle, Heart } from "lucide-react";

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

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isApiError(err)) return err.message;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) {
      setError("Preencha todos os campos");
      return;
    }

    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao iniciar sessao"));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regName || !regEmail || !regPassword) {
      setError("Preencha todos os campos");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("As passwords nao coincidem");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      await register(regName, regEmail, regPassword);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao criar conta"));
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-white to-cyan-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(125,211,252,0.45),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(103,232,249,0.4),transparent_58%)]" />

      <motion.div
        className="pointer-events-none absolute -top-16 -left-10 h-60 w-60 rounded-full bg-sky-200/60 blur-3xl"
        animate={{ x: [0, 14, 0], y: [0, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl"
        animate={{ x: [0, -12, 0], y: [0, -10, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-7 sm:px-6">
        <motion.section
          className="mx-auto w-full max-w-md overflow-hidden rounded-[30px] border border-sky-100/80 bg-white/95 shadow-[0_22px_65px_-28px_rgba(14,165,233,0.45)]"
          initial={{ opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-400 to-teal-300 px-6 pb-7 pt-6 text-white">
            <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-9 bottom-1 h-24 w-24 rounded-full bg-white/15 blur-2xl" />

            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm shadow-md shadow-cyan-500/20">
              <Wallet className="h-7 w-7 text-white" />
            </div>

            <h1 className="text-white">Poupérrimo</h1>
          </div>

          <div className="p-5 sm:p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="mb-5 h-10 w-full rounded-xl bg-sky-100/70 p-1 sm:h-11">
                <TabsTrigger value="login" className="h-full flex-1 rounded-lg">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="h-full flex-1 rounded-lg">Registar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-slate-500">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="nome@exemplo.pt"
                        className="h-10 rounded-xl border-sky-100 bg-white pl-10 sm:h-11"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-slate-500">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="A tua password"
                        className="h-10 rounded-xl border-sky-100 bg-white pl-10 sm:h-11"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-10 rounded-xl border-0 bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow-md shadow-sky-200/70 hover:from-sky-500 hover:to-cyan-500 sm:h-11"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-slate-500">Nome</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="O teu nome"
                        className="h-10 rounded-xl border-sky-100 bg-white pl-10 sm:h-11"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-slate-500">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="nome@exemplo.pt"
                        className="h-10 rounded-xl border-sky-100 bg-white pl-10 sm:h-11"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-slate-500">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="password"
                          placeholder="Min. 6 caracteres"
                          className="h-10 rounded-xl border-sky-100 bg-white pl-10 sm:h-11"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-slate-500">Confirmar</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="password"
                          placeholder="Repete a password"
                          className="h-10 rounded-xl border-sky-100 bg-white pl-10 sm:h-11"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-10 rounded-xl border-0 bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow-md shadow-sky-200/70 hover:from-sky-500 hover:to-cyan-500 sm:h-11"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.section>

        <div className="mt-6 flex items-center justify-center">
          <div className="group relative inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span>made with</span>
            <button
              type="button"
              aria-label={`Nuno Castro ${currentYear}`}
              className="inline-flex items-center text-rose-400 transition-colors hover:text-rose-500"
            >
              <Heart className="h-3.5 w-3.5 fill-current" />
            </button>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-sky-100 bg-white px-2 py-1 text-[11px] text-slate-600 opacity-0 shadow-sm transition-all duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
              Nuno Castro · {currentYear}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
