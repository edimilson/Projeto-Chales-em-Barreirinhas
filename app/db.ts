import { Pool } from "pg";

let pool: Pool | null = null;

function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_URL_POOLED ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.DATABASE_PRISMA_DATABASE_URL
  );
}

export function getPool(): Pool | null {
  const connString = getConnectionString();

  if (!connString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString: connString,
      ssl: connString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 30_000,
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
      "desc" TEXT NOT NULL,
      qty TEXT,
      value NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Confirmado'
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS aportes (
      id BIGINT PRIMARY KEY,
      date TEXT NOT NULL,
      "desc" TEXT NOT NULL,
      value NUMERIC NOT NULL DEFAULT 0
    );
  `);
  return true;
}

export function dbEnabled(): boolean {
  return Boolean(getConnectionString());
}

export function databaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (!dbEnabled()) return "Banco não configurado no ambiente de execução.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Não foi possível localizar o host do banco. Confira a URL configurada.";
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ECONNRESET" || code === "TIMEOUT") return "O host do banco não respondeu. Confira a disponibilidade e a URL de conexão.";
  if (code === "28P01" || code === "28000") return "O banco recusou as credenciais. Atualize a URL de conexão no ambiente.";
  if (code === "3D000") return "O banco indicado na URL não existe ou não está acessível.";
  if (code === "42501") return "O usuário do banco não tem permissão para criar ou consultar as tabelas.";
  return "A conexão com o banco falhou. Consulte os logs do servidor para o código do erro.";
}
