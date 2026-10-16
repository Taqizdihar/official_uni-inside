import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import type { Config } from '../config/env';
import { rows } from './pool';

const dir = resolve(process.cwd(), 'migrations');
type Migration = { version: string; name: string; sql: string; checksum: string };
export async function migrationFiles(): Promise<Migration[]> {
  const files = (await readdir(dir)).filter(f => /^\d{3}_[\w-]+\.sql$/.test(f)).sort();
  return Promise.all(files.map(async name => {
    const sql = await readFile(join(dir, name), 'utf8');
    return { version: name.slice(0, 3), name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}
export async function expectedTables(): Promise<string[]> {
  const initial = (await migrationFiles()).find(m => m.version === '001');
  if (!initial) throw new Error('Missing authoritative migration 001');
  return [...initial.sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/g)].map(m => m[1]!);
}
export async function schemaCheck(pool: Pool) {
  const expected = await expectedTables();
  const [actual] = await pool.query<RowDataPacket[]>('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
  const names = new Set(actual.map(r => String(r.TABLE_NAME)));
  const missing = expected.filter(name => !names.has(name));
  const counts: Record<string, number> = {};
  for (const table of ['roles','permissions','site_settings','page_settings','homepage_section_settings','hero_settings','hero_trust_signals','hero_workspace_content','hero_hotspot_content','about_settings','about_workspaces','about_principles','team_section_settings','achievement_section_settings','contact_section_settings']) {
    if (names.has(table)) {
      const result = await rows<RowDataPacket>(pool, `SELECT COUNT(*) AS count FROM \`${table}\``);
      counts[table] = Number(result[0]?.count ?? 0);
    }
  }
  const fixed = counts.roles === 5 && counts.permissions === 51 && counts.site_settings === 1 && counts.page_settings === 4 && counts.homepage_section_settings === 4 && counts.hero_settings === 1 && counts.hero_trust_signals === 3 && counts.hero_workspace_content === 2 && counts.hero_hotspot_content === 10 && counts.about_settings === 1 && counts.about_workspaces === 2 && counts.about_principles === 3 && counts.team_section_settings === 1 && counts.achievement_section_settings === 1 && counts.contact_section_settings === 1;
  return { expected: expected.length, actual: names.size, missing, counts, fixed, ready: missing.length === 0 && fixed };
}
export async function migrationStatus(pool: Pool) {
  const files = await migrationFiles();
  const [tables] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'");
  const applied = Number(tables[0]?.count) ? await rows<RowDataPacket>(pool, 'SELECT version, checksum, applied_at FROM schema_migrations ORDER BY version') : [];
  return files.map(file => ({ version: file.version, name: file.name, checksum: file.checksum, applied: applied.find(row => row.version === file.version) ?? null }));
}
export async function runMigrations(config: Config) {
  const ssl = config.DB_SSL_MODE === 'required' ? { rejectUnauthorized: true, ...(config.DB_SSL_CA_BASE64 ? { ca: Buffer.from(config.DB_SSL_CA_BASE64, 'base64').toString('utf8') } : {}) } : undefined;
  const conn = await mysql.createConnection({ host: config.DB_HOST, port: config.DB_PORT, database: config.DB_NAME, user: config.DB_USER, password: config.DB_PASSWORD, ssl, charset: 'utf8mb4', timezone: 'Z', multipleStatements: true, connectTimeout: 10_000 });
  let locked = false;
  try {
    const [lock] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK('uni_inside_cms_migration', 15) AS acquired");
    locked = Number(lock[0]?.acquired) === 1;
    if (!locked) throw new Error('Could not acquire migration lock');
    const files = await migrationFiles();
    const [tables] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'");
    if (!Number(tables[0]?.count)) await conn.query('CREATE TABLE schema_migrations (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, version VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(190) NOT NULL, checksum CHAR(64) NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci');
    for (const file of files) {
      const [found] = await conn.execute<RowDataPacket[]>('SELECT checksum FROM schema_migrations WHERE version = ?', [file.version]);
      if (found.length) {
        if (found[0]?.checksum && found[0].checksum !== file.checksum) throw new Error(`Migration ${file.version} checksum mismatch`);
        if (!found[0]?.checksum) {
          if (file.version === '001') {
            const [tables] = await conn.query<RowDataPacket[]>('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
            const names = new Set(tables.map(r => r.TABLE_NAME));
            const expected = await expectedTables();
            if (expected.some(name => !names.has(name))) throw new Error('Cannot adopt migration 001: expected tables are missing');
            const [roleCount] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM roles');
            const [permissionCount] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM permissions');
            const [trustCount] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM hero_trust_signals');
            const [workspaceCount] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS count FROM hero_workspace_content');
            if (Number(roleCount[0]?.count) !== 5 || Number(permissionCount[0]?.count) !== 51 || Number(trustCount[0]?.count) !== 3 || Number(workspaceCount[0]?.count) !== 2) throw new Error('Cannot adopt migration 001: seed counts differ');
          }
          await conn.execute('UPDATE schema_migrations SET checksum = ? WHERE version = ? AND checksum IS NULL', [file.checksum, file.version]);
        }
      } else {
        await conn.query(file.sql);
        await conn.execute('INSERT IGNORE INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)', [file.version, file.name, file.checksum]);
        await conn.execute('UPDATE schema_migrations SET checksum = ? WHERE version = ?', [file.checksum, file.version]);
      }
    }
    return files.length;
  } finally {
    if (locked) await conn.query("SELECT RELEASE_LOCK('uni_inside_cms_migration')");
    await conn.end();
  }
}
