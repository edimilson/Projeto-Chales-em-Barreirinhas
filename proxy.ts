import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET || (process.env.NODE_ENV === "development" ? "chales-barreirinhas-secret-2026" : "");
const COOKIE = "chales_auth";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (sign(payload) !== parts[2]) return false;
  return Number(parts[1]) > Date.now();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;
  const authenticated = isValidToken(token);

  // API de login sempre liberada
  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  // Login via API (POST com senha)
  if (pathname === "/api/auth/check") {
    return NextResponse.json({ authenticated });
  }

  // Página de login
  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protege o resto
  if (!authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
