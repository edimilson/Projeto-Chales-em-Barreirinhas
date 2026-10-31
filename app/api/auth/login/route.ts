import { NextResponse } from "next/server";
import { createHmac } from "crypto";

const SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "chales-barreirinhas-secret-2026" : "");
const PASSWORD = process.env.APP_PASSWORD || (process.env.NODE_ENV === "development" ? "barreirinhas2026" : "");
const COOKIE = "chales_auth";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export async function POST(req: Request) {
  if (!SECRET || !PASSWORD) {
    return NextResponse.json(
      { error: "Configure APP_PASSWORD e AUTH_SECRET nas variáveis de ambiente." },
      { status: 503 },
    );
  }
  try {
    const body = await req.json();
    if (body.password !== PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }
    const payload = `auth.${Date.now() + 1000 * 60 * 60 * 24 * 30}`;
    const token = `${payload}.${sign(payload)}`;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
