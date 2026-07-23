import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

let pool: Pool | null = null;

function loadProjectEnv() {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
  const envPath = join(projectRoot, ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function getPool(): Pool {
  if (!pool) {
    loadProjectEnv();
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params: ReadonlyArray<unknown> = []): Promise<T[]> {
  const [rows] = await getPool().execute(sql, [...params]);
  return rows as T[];
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
