"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import * as XLSX from "xlsx";
import { defaultExpenses, defaultAportes, type Expense, type Aporte } from "./data";
import LogoutButton from "./LogoutButton";

const brl = (v: number) =>
  "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LS_KEY = "chales_barreirinhas_v1";
const databaseRequired = process.env.NODE_ENV === "production";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>(defaultExpenses);
  const [aportes, setAportes] = useState<Aporte[]>(defaultAportes);
  const [loaded, setLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Filtros
  const [phaseFilter, setPhaseFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modais
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingAporte, setEditingAporte] = useState<Aporte | null>(null);

  // Formulários
  const [expForm, setExpForm] = useState({ phase: "FASE_2", desc: "", qty: "", value: "", status: "Confirmado" });
  const [apoForm, setApoForm] = useState({ date: "", desc: "", value: "" });

  const [tasks, setTasks] = useState(90);
  const totalTasks = 205;

  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chartCustos = useRef<Chart | null>(null);
  const chartFisico = useRef<Chart | null>(null);

  const showToast = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Carrega dados: tenta a API (Postgres) primeiro; se indisponível, usa localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [resExp, resApo] = await Promise.all([fetch("/api/expenses"), fetch("/api/aportes")]);
        if (resExp.ok && resApo.ok) {
          const [exp, apo] = await Promise.all([resExp.json(), resApo.json()]);
          if (!cancelled) {
            setExpenses(exp);
            setAportes(apo);
            setIsOnline(true);
          }
          if (!cancelled) setLoaded(true);
          return;
        }
      } catch { /* API indisponível */ }
      if (databaseRequired) {
        if (!cancelled) {
          setLoadError("Banco PostgreSQL indisponível. Os dados não podem ser alterados neste momento.");
          setLoaded(true);
        }
        return;
      }
      // Fallback local, reservado ao desenvolvimento.
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!cancelled && parsed.expenses?.length) setExpenses(parsed.expenses);
          if (!cancelled && parsed.aportes?.length) setAportes(parsed.aportes);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || isOnline || databaseRequired) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ expenses, aportes }));
    } catch { /* ignore */ }
  }, [expenses, aportes, loaded, isOnline]);

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sum = (arr: Expense[], phase: string) =>
    arr.filter((e) => e.phase === phase).reduce((a, c) => a + (parseFloat(String(c.value)) || 0), 0);

  const sumFase1 = sum(expenses, "FASE_1");
  const sumFase2 = sum(expenses, "FASE_2");
  const sumCartao = sum(expenses, "CARTAO");
  const sumPendentes = sum(expenses, "PENDENTE");
  const totalExecutado = sumFase1 + sumFase2 + sumCartao;
  const totalAportes = aportes.reduce((a, c) => a + (parseFloat(String(c.value)) || 0), 0);

  // Cálculo dos aportes
  const baseFase2 = 91831.58;
  const baseUtilizadoAportes = 60259.0;
  const valorUtilizadoAportes = baseUtilizadoAportes + (sumFase2 - baseFase2);
  const saldoAportes = totalAportes - valorUtilizadoAportes;

  const filtered = expenses.filter((item) => {
    const matchPhase = phaseFilter === "ALL" || item.phase === phaseFilter;
    const s = search.toLowerCase();
    const matchSearch =
      (item.desc && item.desc.toLowerCase().includes(s)) ||
      (item.qty && String(item.qty).toLowerCase().includes(s));
    return matchPhase && matchSearch;
  });
  const sumFiltered = filtered.reduce((a, c) => a + (parseFloat(String(c.value)) || 0), 0);

  // Gráficos
  useEffect(() => {
    const c1 = document.getElementById("chartCustosFases") as HTMLCanvasElement | null;
    if (c1) {
      chartCustos.current?.destroy();
      chartCustos.current = new Chart(c1, {
        type: "bar",
        data: {
          labels: ["1ª Fase", "2ª Fase (PIX)", "Cartão Crédito", "Pendentes"],
          datasets: [
            {
              label: "Valor Total (R$)",
              data: [sumFase1, sumFase2, sumCartao, sumPendentes],
              backgroundColor: ["#38bdf8", "#6366f1", "#f59e0b", "#f43f5e"],
              borderRadius: 10,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
    }
    const c2 = document.getElementById("chartProgressoFisico") as HTMLCanvasElement | null;
    if (c2) {
      chartFisico.current?.destroy();
      chartFisico.current = new Chart(c2, {
        type: "doughnut",
        data: {
          labels: ["Executado", "Pendente"],
          datasets: [{ data: [totalExecutado, sumPendentes], backgroundColor: ["#22c55e", "#f43f5e"] }],
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: "74%", plugins: { legend: { display: false } } },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sumFase1, sumFase2, sumCartao, sumPendentes]);

  // Ações — Lançamentos
  const openNewExpense = () => {
    setEditingExpense(null);
    setExpForm({ phase: "FASE_2", desc: "", qty: "", value: "", status: "Confirmado" });
    setShowExpenseModal(true);
  };
  const openEditExpense = (e: Expense) => {
    setEditingExpense(e);
    setExpForm({ phase: e.phase, desc: e.desc, qty: e.qty || "", value: String(e.value), status: e.status });
    setShowExpenseModal(true);
  };
  const reloadFromApi = async () => {
    const [resExp, resApo] = await Promise.all([fetch("/api/expenses"), fetch("/api/aportes")]);
    if (resExp.ok && resApo.ok) {
      setExpenses(await resExp.json());
      setAportes(await resApo.json());
    }
  };

  const canWrite = () => {
    if (databaseRequired && !isOnline) {
      showToast("Banco PostgreSQL indisponível. Nenhuma alteração foi salva.", true);
      return false;
    }
    return true;
  };

  const saveExpense = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canWrite()) return;
    const value = parseFloat(expForm.value) || 0;
    if (isOnline) {
      try {
        const payload = { phase: expForm.phase, desc: expForm.desc, qty: expForm.qty, value, status: expForm.status };
        const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
        const res = await fetch(url, {
          method: editingExpense ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Erro na requisição");
        showToast(editingExpense ? "Lançamento atualizado no banco!" : "Novo lançamento gravado no banco!");
        setShowExpenseModal(false);
        await reloadFromApi();
      } catch (err) {
        alert("Erro ao gravar lançamento: " + (err as Error).message);
      }
      return;
    }
    if (editingExpense) {
      setExpenses((prev) => prev.map((p) => (p.id === editingExpense.id ? { ...editingExpense, ...expForm, value } : p)));
      showToast("Lançamento atualizado!");
    } else {
      setExpenses((prev) => [
        ...prev,
        { id: Date.now(), phase: expForm.phase, desc: expForm.desc, qty: expForm.qty, value, status: expForm.status },
      ]);
      showToast("Novo lançamento gravado!");
    }
    setShowExpenseModal(false);
  };
  const deleteExpense = async (id: number) => {
    if (!canWrite()) return;
    if (!confirm("Deseja realmente excluir este lançamento?")) return;
    if (isOnline) {
      try {
        const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Erro ao excluir");
        showToast("Lançamento excluído do banco!");
        await reloadFromApi();
      } catch (err) {
        alert("Erro ao excluir: " + (err as Error).message);
      }
      return;
    }
    setExpenses((prev) => prev.filter((p) => p.id !== id));
    showToast("Lançamento excluído!");
  };

  // Ações — Aportes
  const openNewAporte = () => {
    setEditingAporte(null);
    setApoForm({ date: "", desc: "", value: "" });
    setShowAporteModal(true);
  };
  const openEditAporte = (a: Aporte) => {
    setEditingAporte(a);
    setApoForm({ date: a.date, desc: a.desc, value: String(a.value) });
    setShowAporteModal(true);
  };
  const saveAporte = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canWrite()) return;
    const value = parseFloat(apoForm.value) || 0;
    if (isOnline) {
      try {
        const payload = { date: apoForm.date, desc: apoForm.desc, value };
        const url = editingAporte ? `/api/aportes/${editingAporte.id}` : "/api/aportes";
        const res = await fetch(url, {
          method: editingAporte ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Erro na requisição");
        showToast(editingAporte ? "Aporte atualizado no banco!" : "Novo aporte gravado no banco!");
        setShowAporteModal(false);
        await reloadFromApi();
      } catch (err) {
        alert("Erro ao gravar aporte: " + (err as Error).message);
      }
      return;
    }
    if (editingAporte) {
      setAportes((prev) => prev.map((p) => (p.id === editingAporte.id ? { ...editingAporte, ...apoForm, value } : p)));
      showToast("Aporte atualizado!");
    } else {
      setAportes((prev) => [...prev, { id: Date.now(), date: apoForm.date, desc: apoForm.desc, value }]);
      showToast("Novo aporte gravado!");
    }
    setShowAporteModal(false);
  };
  const deleteAporte = async (id: number) => {
    if (!canWrite()) return;
    if (!confirm("Deseja realmente excluir este aporte?")) return;
    if (isOnline) {
      try {
        const res = await fetch(`/api/aportes/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Erro ao excluir");
        showToast("Aporte excluído do banco!");
        await reloadFromApi();
      } catch (err) {
        alert("Erro ao excluir: " + (err as Error).message);
      }
      return;
    }
    setAportes((prev) => prev.filter((p) => p.id !== id));
    showToast("Aporte excluído!");
  };

  // Exportações
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(expenses);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, "Chales_Barreirinhas.xlsx");
    showToast("Planilha Excel gerada!");
  };
  const exportBackupJSON = async () => {
    if (databaseRequired && !isOnline) {
      showToast("Banco PostgreSQL indisponível. Não é possível exportar o backup.", true);
      return;
    }
    if (isOnline) {
      try {
        const res = await fetch("/api/backup");
        if (res.ok) {
          const backup = await res.json();
          download(JSON.stringify(backup, null, 2), "Chales_Barreirinhas_Backup.json", "application/json");
          showToast("Backup JSON exportado do banco!");
          return;
        }
      } catch { /* fallback abaixo */ }
    }
    download(JSON.stringify({ expenses, aportes }, null, 2), "Chales_Barreirinhas_Backup.json", "application/json");
    showToast("Backup JSON exportado!");
  };
  const importBackupFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (!canWrite()) {
      ev.target.value = "";
      return;
    }
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result));
        if (!parsed.expenses) throw new Error("Arquivo de backup inválido.");
        if (isOnline) {
          if (!confirm("Restaurar este backup vai substituir todos os lançamentos e aportes do banco. Continuar?")) return;
          const res = await fetch("/api/backup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed),
          });
          if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Falha ao restaurar.");
          showToast("Dados restaurados no banco com sucesso!");
          await reloadFromApi();
          return;
        }
        setExpenses(parsed.expenses);
        setAportes(parsed.aportes || []);
        showToast("Dados restaurados com sucesso!");
      } catch (err) {
        alert("Erro ao processar o arquivo de backup: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  };
  const resetDefaultData = async () => {
    if (!canWrite()) return;
    if (!confirm("Resetar todos os dados ao padrão original? Os dados atuais serão substituídos.")) return;
    if (isOnline) {
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "Falha ao resetar.");
        showToast("Banco restaurado para o padrão original!");
        await reloadFromApi();
      } catch (err) {
        alert("Erro ao resetar: " + (err as Error).message);
      }
      return;
    }
    setExpenses(defaultExpenses);
    setAportes(defaultAportes);
    showToast("Dados restaurados para o padrão original!");
  };
  const toggleTheme = () => document.documentElement.classList.toggle("dark");

  const phaseBadge = (phase: string) => {
    if (phase === "FASE_1") return <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">1ª Fase</span>;
    if (phase === "FASE_2") return <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">2ª Fase</span>;
    if (phase === "CARTAO") return <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30">Cartão Crédito</span>;
    return <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-500 font-bold border border-rose-500/30">Pendente</span>;
  };
  const statusBadge = (status: string) => {
    if (status === "Auditado")
      return <span className="inline-flex items-center text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-500/20"><i className="fa-solid fa-shield-halved text-[10px] mr-1.5"></i> Auditado</span>;
    if (status === "Cartão Crédito")
      return <span className="inline-flex items-center text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-500/20"><i className="fa-regular fa-credit-card text-[10px] mr-1.5"></i> Cartão</span>;
    if (status === "PENDENTE")
      return <span className="inline-flex items-center text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg text-xs font-semibold border border-rose-500/20"><i className="fa-solid fa-clock text-[10px] mr-1.5"></i> Pendente</span>;
    return <span className="inline-flex items-center text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-xs font-semibold border border-emerald-500/20"><i className="fa-solid fa-money-bill-wave text-[10px] mr-1.5"></i> Dinheiro / PIX</span>;
  };

  return (
    <>
      <input type="file" id="backup-file-input" accept=".json" onChange={importBackupFile} className="hidden" />

      {/* Top Navigation Bar */}
      <header className="glass-nav sticky top-0 z-30 border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-brand-600 via-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-base sm:text-lg shadow-md shadow-brand-500/20">
                <i className="fa-solid fa-house-chimney-window"></i>
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-dynamic-white">Projeto Chalés em Barreirinhas</h1>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Controle Detalhado de Materiais &amp; Execução 2ª Fase</p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button onClick={toggleTheme} className="bg-slate-800/90 hover:bg-slate-700/90 text-amber-400 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-slate-700/70 shadow-sm active:scale-95" title="Alternar Tema">
                <i className="fa-solid fa-sun text-xs"></i>
                <span className="hidden md:inline text-[11px] font-semibold">Tema</span>
              </button>

              <button onClick={exportBackupJSON} className="bg-indigo-900/80 hover:bg-indigo-800/90 text-indigo-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-indigo-700/70 shadow-sm active:scale-95" title="Exportar dados em JSON">
                <i className="fa-solid fa-download text-xs"></i>
                <span className="hidden lg:inline text-[11px] font-semibold">Backup JSON</span>
              </button>

              <button onClick={() => (document.getElementById("backup-file-input") as HTMLInputElement).click()} className="bg-slate-800/90 hover:bg-slate-700/90 text-indigo-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-slate-700/70 shadow-sm active:scale-95" title="Restaurar dados de arquivo JSON">
                <i className="fa-solid fa-upload text-xs"></i>
                <span className="hidden lg:inline text-[11px] font-semibold">Restaurar</span>
              </button>

              <button onClick={exportExcel} className="bg-emerald-900/80 hover:bg-emerald-800/90 text-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-emerald-700/70 shadow-sm active:scale-95">
                <i className="fa-solid fa-file-excel text-xs"></i>
                <span className="hidden sm:inline text-[11px] font-semibold">Excel</span>
              </button>

              <button onClick={() => window.print()} className="bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-slate-700/70 shadow-sm active:scale-95">
                <i className="fa-solid fa-file-pdf text-rose-400 text-xs"></i>
                <span className="hidden sm:inline text-[11px] font-semibold">Imprimir</span>
              </button>

              <LogoutButton />

              <button onClick={openNewExpense} className="bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md shadow-brand-500/20 flex items-center gap-1.5 active:scale-95">
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span className="hidden sm:inline text-[11px]">Novo Lançamento</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden glass-card border border-amber-500/20 p-4 rounded-2xl shadow-lg transition-all">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 text-base border border-amber-500/20 shadow-sm">
                <i className="fa-solid fa-clipboard-check"></i>
              </div>
              <div>
                <h3 className="font-bold text-amber-500 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2">
                  Controle de Materiais e Mão de Obra Atualizado
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">2ª Fase</span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-amber-300/80 mt-0.5">
                  {isOnline
                    ? "Persistência oficial em banco PostgreSQL — dados sincronizados via API."
                    : databaseRequired
                      ? loadError || "Conectando ao banco PostgreSQL..."
                      : "Dados salvos no navegador (localStorage) — exporte o Backup JSON regularmente."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={resetDefaultData} className="text-[10px] font-bold text-slate-400 hover:text-rose-400 transition underline mr-2" title="Voltar aos dados originais de fábrica">Resetar ao Padrão</button>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold border shadow-inner ${isOnline ? "bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" : databaseRequired ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? "bg-emerald-500 animate-pulse" : databaseRequired ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`}></span>
                {isOnline ? `PostgreSQL Conectado (${expenses.length} registros)` : databaseRequired ? "Banco indisponível" : "Armazenamento Local Ativo"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="glass-card p-5 rounded-2xl border flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total Realizado</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-wallet text-sm"></i></div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-dynamic-white tracking-tight">{brl(totalExecutado)}</p>
              <div className="mt-2 flex items-center text-xs text-slate-400 font-medium">
                <span className="text-emerald-500 font-bold flex items-center mr-1"><i className="fa-solid fa-circle-check mr-1 text-[10px]"></i> Confirmado</span>
                • Somatório Pago
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border flex flex-col justify-between hover:border-sky-500/50 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>1ª Fase (Total)</span>
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-flag text-sm"></i></div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-dynamic-white tracking-tight">{brl(sumFase1)}</p>
              <p className="mt-2 text-xs text-slate-400 font-medium">Viagem, materiais &amp; taxas</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>2ª Fase (À Vista/PIX)</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-money-bill-transfer text-sm"></i></div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-dynamic-white tracking-tight">{brl(sumFase2)}</p>
              <p className="mt-2 text-xs text-slate-400 font-medium">Mão de obra &amp; compras</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Cartão de Crédito</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform"><i className="fa-regular fa-credit-card text-sm"></i></div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-dynamic-white tracking-tight">{brl(sumCartao)}</p>
              <p className="mt-2 text-xs text-slate-400 font-medium">Insumos parcelados / Fatura</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border flex flex-col justify-between hover:border-rose-500/50 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Pendentes / Orçar</span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-clock text-sm"></i></div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-rose-500 dark:text-rose-400 tracking-tight">{brl(sumPendentes)}</p>
              <p className="mt-2 text-xs text-slate-400 font-medium">Compromissos a realizar</p>
            </div>
          </div>
        </section>

        {/* Aportes */}
        <section className="glass-card p-6 rounded-2xl border space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
            <div>
              <h2 className="font-bold text-dynamic-white text-lg flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-dollar text-purple-400"></i> Aportes Realizados
              </h2>
              <p className="text-xs text-slate-400">Resumo de aportes recebidos vs. consumo para pagamentos da 2ª Fase</p>
            </div>
            <button onClick={openNewAporte} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
              <i className="fa-solid fa-plus text-[10px]"></i> <span>Novo Aporte</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-950/30 rounded-xl border border-purple-500/30">
            <div className="flex flex-col justify-center">
              <span className="text-slate-400 font-medium text-xs block">Total de Aportes Recebidos:</span>
              <strong className="text-purple-400 text-xl font-black mt-0.5">{brl(totalAportes)}</strong>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-slate-400 font-medium text-xs block">Valor Utilizado dos Aportes:</span>
              <strong className="text-amber-400 text-xl font-black mt-0.5">{brl(valorUtilizadoAportes)}</strong>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-slate-400 font-medium text-xs block">Saldo Disponível dos Aportes:</span>
              <strong className={(saldoAportes < 0 ? "text-rose-400" : "text-emerald-400") + " text-xl font-black mt-0.5"}>{brl(saldoAportes)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-700/50">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-card-element backdrop-blur-md">
                <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-700/50">
                  <th className="py-3 px-4">Data / Referência</th>
                  <th className="py-3 px-4">Descrição do Aporte</th>
                  <th className="py-3 px-4">Valor (R$)</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-medium">
                {aportes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-500/10 transition-colors duration-150">
                    <td className="py-3 px-4 font-semibold text-purple-400">{item.date}</td>
                    <td className="py-3 px-4 font-semibold text-dynamic-white">{item.desc}</td>
                    <td className="py-3 px-4 font-black text-emerald-400">{brl(item.value)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button onClick={() => openEditAporte(item)} className="text-slate-400 hover:text-amber-400 transition p-1.5 rounded-lg hover:bg-slate-500/20" title="Editar Aporte"><i className="fa-solid fa-pen-to-square"></i></button>
                        <button onClick={() => deleteAporte(item.id)} className="text-slate-400 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-slate-500/20" title="Excluir Aporte"><i className="fa-regular fa-trash-can"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-5.5 rounded-2xl border lg:col-span-2 flex flex-col shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <div>
                <h2 className="font-bold text-dynamic-white text-base">Distribuição Financeira por Categoria / Fase</h2>
                <p className="text-xs text-slate-400">Comparativo das etapas executadas e compromissos futuros</p>
              </div>
            </div>
            <div className="flex-1 min-h-[270px] pt-4 relative">
              <canvas id="chartCustosFases"></canvas>
            </div>
          </div>

          <div className="glass-card p-5.5 rounded-2xl border flex flex-col shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <div>
                <h2 className="font-bold text-dynamic-white text-base">Proporção do Orçamento</h2>
                <p className="text-xs text-slate-400">Gastos efetivados vs. Previsão pendente</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center pt-2 relative">
              <canvas id="chartProgressoFisico" className="max-h-[220px]"></canvas>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/20">
                <span className="text-emerald-400 font-semibold block mb-0.5">Total Executado</span>
                <strong className="text-emerald-300 text-sm font-extrabold">{brl(totalExecutado)}</strong>
              </div>
              <div className="p-2.5 bg-rose-950/40 rounded-xl border border-rose-500/20">
                <span className="text-rose-400 font-semibold block mb-0.5">Total Pendente</span>
                <strong className="text-rose-300 text-sm font-extrabold">{brl(sumPendentes)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Expenses Table */}
        <section className="glass-card p-6 rounded-2xl border space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-700/50">
            <div>
              <h2 className="font-bold text-dynamic-white text-lg">Controle Detalhado de Lançamentos e Materiais</h2>
              <p className="text-xs text-slate-400">Mapeamento individualizado de todos os lançamentos</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-inner">
                <i className="fa-solid fa-calculator text-emerald-500"></i>
                <span>Total Filtrado:</span>
                <strong className="text-dynamic-white font-black ml-1 text-xs">{brl(sumFiltered)}</strong>
              </div>
              <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} className="bg-card-element border text-xs rounded-xl px-3 py-2 font-medium outline-none">
                <option value="ALL">Todas as Categorias</option>
                <option value="FASE_1">1ª Fase</option>
                <option value="FASE_2">2ª Fase (À Vista / PIX)</option>
                <option value="CARTAO">Cartão de Crédito</option>
                <option value="PENDENTE">Pendentes / A Orçar</option>
              </select>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs"></i>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar material/serviço..." className="pl-9 pr-3.5 py-2 bg-card-element border rounded-xl text-xs w-48 sm:w-56 outline-none" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar max-h-[550px] rounded-xl border border-slate-700/50">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-card-element backdrop-blur-md z-10">
                <tr className="text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-700/50">
                  <th className="py-3.5 px-4">Fase / Tipo</th>
                  <th className="py-3.5 px-4">Material / Serviço</th>
                  <th className="py-3.5 px-4">Qtd / Detalhes</th>
                  <th className="py-3.5 px-4">Valor (R$)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-xs font-medium">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500 text-xs font-semibold">Nenhum lançamento encontrado.</td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-500/10 transition-colors duration-150">
                      <td className="py-3 px-4">{phaseBadge(item.phase)}</td>
                      <td className="py-3 px-4 font-semibold text-dynamic-white">{item.desc}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{item.qty || "-"}</td>
                      <td className="py-3 px-4 font-black text-dynamic-white">{brl(parseFloat(String(item.value)))}</td>
                      <td className="py-3 px-4">{statusBadge(item.status)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button onClick={() => openEditExpense(item)} className="text-slate-400 hover:text-amber-400 transition p-1.5 rounded-lg hover:bg-slate-500/20" title="Editar Lançamento"><i className="fa-solid fa-pen-to-square"></i></button>
                          <button onClick={() => deleteExpense(item.id)} className="text-slate-400 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-slate-500/20" title="Excluir Lançamento"><i className="fa-regular fa-trash-can"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Guidelines & Slider */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border space-y-4 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20"><i className="fa-solid fa-list-check"></i></div>
              <h2 className="font-bold text-dynamic-white">Boas Práticas de Gestão</h2>
            </div>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-card-element border flex items-start space-x-3 text-xs">
                <i className="fa-solid fa-circle-info text-blue-500 mt-0.5"></i>
                <div>
                  <strong className="text-dynamic-white block mb-0.5">Identificação de Cartão x PIX</strong>
                  <span className="text-slate-400 leading-relaxed">Os insumos comprados no cartão de crédito foram separados do caixa à vista para facilitar o acompanhamento da fatura.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border space-y-4 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/20"><i className="fa-solid fa-bars-progress"></i></div>
              <h2 className="font-bold text-dynamic-white">Acompanhamento do Avanço Físico</h2>
            </div>
            <div className="p-4 bg-card-element rounded-xl space-y-3 border">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-dynamic-white">Etapas / Unidades Concluídas:</span>
                <span className="text-purple-400 text-sm font-extrabold">{tasks} / {totalTasks}</span>
              </div>
              <input type="range" min={0} max={totalTasks} value={tasks} onChange={(e) => setTasks(parseInt(e.target.value) || 0)} className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-700 rounded-lg" />
            </div>
          </div>
        </section>
      </main>

      {/* Modal Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h3 className="font-bold text-dynamic-white text-base">{editingExpense ? "Editar Lançamento" : "Adicionar Lançamento"}</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-200"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={saveExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fase / Categoria</label>
                <select value={expForm.phase} onChange={(e) => setExpForm({ ...expForm, phase: e.target.value })} required className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none">
                  <option value="FASE_1">1ª Fase</option>
                  <option value="FASE_2">2ª Fase (À Vista / PIX)</option>
                  <option value="CARTAO">Cartão de Crédito</option>
                  <option value="PENDENTE">Pendente / A Orçar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <input type="text" value={expForm.desc} onChange={(e) => setExpForm({ ...expForm, desc: e.target.value })} required placeholder="Ex: Compra de tubos" className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantidade</label>
                  <input type="text" value={expForm.qty} onChange={(e) => setExpForm({ ...expForm, qty: e.target.value })} placeholder="Ex: 10 un" className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" value={expForm.value} onChange={(e) => setExpForm({ ...expForm, value: e.target.value })} required placeholder="0,00" className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <select value={expForm.status} onChange={(e) => setExpForm({ ...expForm, status: e.target.value })} className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none">
                  <option value="Confirmado">Dinheiro / PIX</option>
                  <option value="Auditado">Auditado</option>
                  <option value="Cartão Crédito">Cartão Crédito</option>
                  <option value="PENDENTE">PENDENTE</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-3.5 py-1.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg">Cancelar</button>
                <button type="submit" className="px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-emerald-500 text-slate-950 font-bold text-xs rounded-lg">Salvar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Aporte */}
      {showAporteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h3 className="font-bold text-dynamic-white text-base">{editingAporte ? "Editar Aporte" : "Adicionar Aporte Realizado"}</h3>
              <button onClick={() => setShowAporteModal(false)} className="text-slate-400 hover:text-slate-200"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <form onSubmit={saveAporte} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data / Referência</label>
                <input type="text" value={apoForm.date} onChange={(e) => setApoForm({ ...apoForm, date: e.target.value })} required placeholder="Ex: 15/09/2026" className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <input type="text" value={apoForm.desc} onChange={(e) => setApoForm({ ...apoForm, desc: e.target.value })} required placeholder="Ex: Transferência PIX" className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Valor do Aporte (R$)</label>
                <input type="number" step="0.01" value={apoForm.value} onChange={(e) => setApoForm({ ...apoForm, value: e.target.value })} required placeholder="0,00" className="w-full bg-card-element border rounded-xl px-3.5 py-2.5 text-xs outline-none" />
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAporteModal(false)} className="px-3.5 py-1.5 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg">Cancelar</button>
                <button type="submit" className="px-3.5 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-lg">Salvar Aporte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 border ${toast.err ? "bg-rose-950/90 text-rose-300 border-rose-500/50" : "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"}`}>
          <i className={`fa-solid ${toast.err ? "fa-triangle-exclamation text-rose-400" : "fa-circle-check text-emerald-400"}`}></i>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}
