"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha na autenticação.");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4">
      <div className="glass-card rounded-2xl max-w-sm w-full p-8 shadow-2xl border space-y-5">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-2xl shadow-md shadow-brand-500/20">
            <i className="fa-solid fa-house-chimney-window"></i>
          </div>
          <div>
            <h1 className="font-bold text-dynamic-white text-lg">Projeto Chalés em Barreirinhas</h1>
            <p className="text-xs text-slate-400 mt-0.5">Acesso restrito — digite sua senha</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="••••••••"
              className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500/60"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-xs font-semibold">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl py-2.5 transition-all disabled:opacity-60 shadow-md shadow-brand-500/20"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
