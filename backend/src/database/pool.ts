import mysql, { type Connection, type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import type { Config } from '../config/env';
import { databaseTlsOptions } from './tls';

export type Database = Pool;
export type Executor = Pool | PoolConnection | Connection;
export function createPool(config: Config): Pool {
  const ssl = databaseTlsOptions(config);
  return mysql.createPool({
    host: config.DB_HOST, port: config.DB_PORT, database: config.DB_NAME,
    user: config.DB_USER, password: config.DB_PASSWORD, ssl,
    charset: 'utf8mb4', timezone: 'Z', waitForConnections: true,
    connectionLimit: config.DB_CONNECTION_LIMIT, connectTimeout: 10_000,
    multipleStatements: false, dateStrings: true, supportBigNumbers: true,
    bigNumberStrings: false,
  });
}
export async function rows<T extends RowDataPacket>(db: Executor, sql: string, values: unknown[] = []): Promise<T[]> {
  const [result] = await db.execute<T[]>({sql,timeout:10_000}, values as any[]);
  return result;
}
export async function write(db: Executor, sql: string, values: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await db.execute<ResultSetHeader>({sql,timeout:10_000}, values as any[]);
  return result;
}
export async function transaction<T>(pool: Pool, work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const value = await work(conn);
    await conn.commit();
    return value;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}
