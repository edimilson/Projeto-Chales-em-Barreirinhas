import { NextResponse } from "next/server";
import { getPool, ensureTables, dbEnabled } from "../../db";
import { defaultExpenses, defaultAportes } from "../../data";

export async function POST() {
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    await ensureTables();
    const p = getPool()!;
    await p.query("DELETE FROM expenses");
    await p.query("DELETE FROM aportes");
    for (const e of defaultExpenses) {
      await p.query("INSERT INTO expenses (id, phase, desc, qty, value, status) VALUES ($1,$2,$3,$4,$5,$6)", [
        e.id,
        e.phase,
        e.desc,
        e.qty,
        e.value,
        e.status,
      ]);
    }
    for (const a of defaultAportes) {
      await p.query("INSERT INTO aportes (id, date, desc, value) VALUES ($1,$2,$3,$4)", [
        a.id,
        a.date,
        a.desc,
        a.value,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
  