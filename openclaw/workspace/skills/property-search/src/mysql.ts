import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import { loadProjectEnv } from "./loadEnv.js";

let pool: Pool | null = null;

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
