import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  const connString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: connString,
      ssl: connString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function ensureTables() {
  const p = getPool();
  if (!p) return false;
  await p.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id BIGINT PRIMARY KEY,
      phase TEXT NOT NULL,
      desc TEXT NOT NULL,
      qty TEXT,
      value NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Confirmado'
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS aportes (
      id BIGINT PRIMARY KEY,
      date TEXT NOT NULL,
      desc TEXT NOT NULL,
      value NUMERIC NOT NULL DEFAULT 0
    );
  `);
  return true;
}

export function dbEnabled(): boolean {
  return Boolean(
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}
