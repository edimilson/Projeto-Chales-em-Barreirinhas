import { NextResponse } from "next/server";
import { getPool, ensureTables, dbEnabled } from "../../db";

export async function GET() {
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    await ensureTables();
    const p = getPool()!;
    const expenses = (await p.query("SELECT * FROM expenses ORDER BY id")).rows;
    const aportes = (await p.query("SELECT * FROM aportes ORDER BY id")).rows;
    return NextResponse.json({ expenses, aportes });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Restaurar backup
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    await ensureTables();
    const p = getPool()!;
    const body = await req.json();
    if (!Array.isArray(body.expenses)) {
      return NextResponse.json({ error: "Arquivo de backup inválido." }, { status: 400 });
    }
    const client = await p.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM expenses");
      await client.query("DELETE FROM aportes");
    for (const e of body.expenses) {
      await client.query('INSERT INTO expenses (id, phase, "desc", qty, value, status) VALUES ($1,$2,$3,$4,$5,$6)', [
        e.id,
        e.phase,
        e.desc,
        e.qty || null,
        e.value || 0,
        e.status || "Confirmado",
      ]);
    }
    for (const a of body.aportes || []) {
      await client.query('INSERT INTO aportes (id, date, "desc", value) VALUES ($1,$2,$3,$4)', [
        a.id,
        a.date,
        a.desc,
        a.value || 0,
      ]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
