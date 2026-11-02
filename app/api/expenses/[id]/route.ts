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
    const r = await p.query(
      'UPDATE expenses SET phase=$1, "desc"=$2, qty=$3, value=$4, status=$5 WHERE id=$6 RETURNING *',
      [body.phase, body.desc, body.qty || null, body.value || 0, body.status, id]
    );
    if (r.rowCount === 0) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
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
    await p.query("DELETE FROM expenses WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
