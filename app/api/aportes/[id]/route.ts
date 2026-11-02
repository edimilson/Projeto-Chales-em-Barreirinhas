import { NextResponse } from "next/server";
import { getPool, dbEnabled } from "../../../db";

export async function PUT(req: Request) {
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    const p = getPool()!;
    const id = new URL(req.url).pathname.split("/").pop();
    const body = await req.json();
    const r = await p.query('UPDATE aportes SET date=$1, "desc"=$2, value=$3 WHERE id=$4 RETURNING *', [
      body.date,
      body.desc,
      body.value || 0,
      id,
    ]);
    if (r.rowCount === 0) return NextResponse.json({ error: "Aporte não encontrado." }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!dbEnabled()) {
    return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  }
  try {
    const p = getPool()!;
    const id = new URL(req.url).pathname.split("/").pop();
    await p.query("DELETE FROM aportes WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
