"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      onClick={handleLogout}
      className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border border-rose-700/70 shadow-sm active:scale-95"
      title="Sair do sistema"
    >
      <i className="fa-solid fa-right-from-bracket text-xs"></i>
      <span className="hidden sm:inline text-[11px] font-semibold">Sair</span>
    </button>
  );
}
