import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/auth-context";
import { isApiError } from "../lib/http-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Wallet, Loader2, Mail, Lock, UserCircle, Heart, Sparkles, ShieldCheck } from "lucide-react";

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
        className="pointer-events-none absolute -top-14 -left-8 h-56 w-56 rounded-full bg-sky-200/60 blur-3xl"
        animate={{ x: [0, 12, 0], y: [0, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl"
        animate={{ x: [0, -10, 0], y: [0, -12, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          className="grid gap-4 md:grid-cols-2 md:gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <motion.section
            className="order-2 rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-xl shadow-sky-100/60 backdrop-blur-sm sm:p-6 md:order-1 lg:p-7"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
          >
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-cyan-300 shadow-md shadow-cyan-200/60 sm:h-16 sm:w-16">
              <Wallet className="h-7 w-7 text-white sm:h-8 sm:w-8" />
            </div>

            <h1 className="mb-2 tracking-tight text-slate-900">Poupérrimo</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Uma casa para o teu dinheiro. Simples, bonita e feita para te dar clareza todos os meses.
            </p>

            <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
              <div className="flex items-start gap-2.5 rounded-2xl bg-sky-50 px-3.5 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-sky-500" />
                <p className="text-sm text-slate-700">Planeia melhor sem folhas de calculo e sem atrito.</p>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl bg-cyan-50 px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-600" />
                <p className="text-sm text-slate-700">Tudo num unico sitio, com ritmo e consistencia.</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="order-1 rounded-3xl border border-white bg-white/95 p-5 shadow-2xl shadow-sky-100/70 backdrop-blur-sm sm:p-6 md:order-2 lg:p-7"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
          >
            <div className="mb-5 sm:mb-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-[11px] text-sky-700 sm:hidden">
                <Wallet className="h-3.5 w-3.5" />
                Poupérrimo
              </div>
              <h2 className="text-slate-900">Bem-vindo</h2>
              <p className="mt-1 text-sm text-slate-500">Entra na tua conta ou cria uma nova em poucos segundos.</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="mb-5 h-10 w-full rounded-xl bg-sky-100/70 p-1 sm:mb-6 sm:h-11">
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
                    className="h-10 rounded-xl border-0 bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow-md shadow-sky-200/60 hover:from-sky-500 hover:to-cyan-500 sm:h-11"
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
                    className="h-10 rounded-xl border-0 bg-gradient-to-r from-sky-400 to-cyan-400 text-white shadow-md shadow-sky-200/60 hover:from-sky-500 hover:to-cyan-500 sm:h-11"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </motion.section>
        </motion.div>

        <div className="mt-5 flex items-center justify-center pb-1 sm:mt-6">
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
