import { NextResponse } from "next/server";
import { databaseErrorMessage, dbEnabled, getPool } from "../../../db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  if (!dbEnabled()) {
    return NextResponse.json({ connected: false, message: databaseErrorMessage(null) }, { status: 503 });
  }

  try {
    await getPool()!.query("SELECT 1");
    return NextResponse.json({ connected: true });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    console.error("Database health check failed", code || "unknown");
    return NextResponse.json({ connected: false, message: databaseErrorMessage(error) }, { status: 503 });
  }
}
