import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/auth-context";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Wallet, Loader2, Mail, Lock, UserCircle } from "lucide-react";

export function AuthPage() {
  const { login, register, isLoading } = useAuth();
  const [loginEmail, setLoginEmail] = useState("joao@exemplo.pt");
  const [loginPassword, setLoginPassword] = useState("123456");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginEmail || !loginPassword) { setError("Preencha todos os campos"); return; }
    try { await login(loginEmail, loginPassword); } catch { setError("Erro ao iniciar sessao"); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!regName || !regEmail || !regPassword) { setError("Preencha todos os campos"); return; }
    if (regPassword !== regConfirm) { setError("As passwords nao coincidem"); return; }
    if (regPassword.length < 6) { setError("Password deve ter pelo menos 6 caracteres"); return; }
    try { await register(regName, regEmail, regPassword); } catch { setError("Erro ao criar conta"); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.1),transparent_50%)]" />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-4 shadow-2xl border border-white/30">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white drop-shadow-lg">Poupérrimo</h1>
        </motion.div>

        {/* Glass Card */}
        <motion.div
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-foreground">Bem-vindo</h2>
              <p className="text-muted-foreground text-sm mt-1">Inicie sessao ou crie uma conta para comecar</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full mb-6 h-11 bg-muted/80 p-1">
                <TabsTrigger value="login" className="flex-1 h-full">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="flex-1 h-full">Registar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-sm">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="nome@exemplo.pt"
                        className="pl-10 h-11 rounded-xl"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-sm">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="A sua password"
                        className="pl-10 h-11 rounded-xl"
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
                        className="text-destructive text-sm bg-red-50 px-3 py-2 rounded-xl"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white shadow-lg shadow-slate-500/20 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-sm">Nome</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="O seu nome" className="pl-10 h-11 rounded-xl" value={regName} onChange={(e) => setRegName(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-sm">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" placeholder="nome@exemplo.pt" className="pl-10 h-11 rounded-xl" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-sm">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="password" placeholder="Min. 6 caracteres" className="pl-10 h-11 rounded-xl" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-muted-foreground text-sm">Confirmar Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="password" placeholder="Repita a password" className="pl-10 h-11 rounded-xl" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-destructive text-sm bg-red-50 px-3 py-2 rounded-xl"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <Button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950 text-white shadow-lg shadow-slate-500/20 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
