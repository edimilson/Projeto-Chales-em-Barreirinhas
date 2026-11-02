import { NextResponse } from "next/server";
import { databaseErrorMessage, getPool, ensureTables, dbEnabled } from "../../db";

export const maxDuration = 60;

export async function GET() {
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    await ensureTables();
    const p = getPool()!;
    const r = await p.query("SELECT * FROM aportes ORDER BY id");
    return NextResponse.json(r.rows);
  } catch (e) {
    console.error("Aportes API database error", (e as { code?: string })?.code || "unknown");
    return NextResponse.json({ error: databaseErrorMessage(e) }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    await ensureTables();
    const p = getPool()!;
    const body = await req.json();
    const id = Date.now();
    await p.query('INSERT INTO aportes (id, date, "desc", value) VALUES ($1,$2,$3,$4)', [
      id,
      body.date,
      body.desc,
      body.value || 0,
    ]);
    const r = await p.query("SELECT * FROM aportes WHERE id = $1", [id]);
    return NextResponse.json(r.rows[0], { status: 201 });
  } catch (e) {
    console.error("Aportes API database error", (e as { code?: string })?.code || "unknown");
    return NextResponse.json({ error: databaseErrorMessage(e) }, { status: 503 });
  }
}
