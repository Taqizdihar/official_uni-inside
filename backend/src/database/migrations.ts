import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import type { Config } from '../config/env';
import { rows, type Executor } from './pool';
import { databaseTlsOptions } from './tls';

const dir = resolve(process.cwd(), 'migrations');
type Migration = { version: string; name: string; sql: string; checksum: string };
export const LEGACY_001_CHECKSUM = '1af04aa15d82825ff80c3ecc5ba619e1e9f2956e7fa68fb30fedcbcee1119ea2';
export const CURRENT_001_CHECKSUM = 'cd4f1a594f7fe56f560d0854c389262d19b8014e2d40f0c22f11088a0bc22e99';
export type MigrationState = 'applied' | 'pending' | 'reconciled_legacy_checksum' | 'checksum_mismatch';
export function classifyMigration(version:string, expected:string, stored:string|null, historicalSchemaReady:boolean):MigrationState {
  if(stored===null)return 'pending';
  if(stored===expected)return 'applied';
  if(version==='001' && expected===CURRENT_001_CHECKSUM && stored===LEGACY_001_CHECKSUM && historicalSchemaReady)return 'reconciled_legacy_checksum';
  return 'checksum_mismatch';
}
export async function migrationFiles(): Promise<Migration[]> {
  const files = (await readdir(dir)).filter(f => /^\d{3}_[\w-]+\.sql$/.test(f)).sort();
  const versions=files.map(name=>name.slice(0,3));
  if(new Set(versions).size!==versions.length)throw new Error('Duplicate migration version in active directory');
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
export async function schemaCheck(pool: Executor) {
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
export async function historicalSchemaCheck(pool:Executor) {
  const base=await schemaCheck(pool);
  const initial=(await migrationFiles()).find(file=>file.version==='001');
  if(!initial || initial.checksum!==CURRENT_001_CHECKSUM)throw new Error('Migration 001 source differs from the reviewed checksum');
  const expected=[
    ...[...initial.sql.matchAll(/CONSTRAINT\s+(chk_\w+)\s+CHECK\s*\(/g)].map(match=>['CHECK',match[1]!] as const),
    ...[...initial.sql.matchAll(/CONSTRAINT\s+(fk_\w+)\s+FOREIGN KEY/g)].map(match=>['FOREIGN KEY',match[1]!] as const),
    ...[...initial.sql.matchAll(/UNIQUE KEY\s+(uq_\w+)/g)].map(match=>['UNIQUE',match[1]!] as const),
  ];
  const [found]=await pool.query<RowDataPacket[]>("SELECT CONSTRAINT_TYPE, CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()");
  const actual=new Set(found.map(row=>`${row.CONSTRAINT_TYPE}:${row.CONSTRAINT_NAME}`));
  const missingConstraints=expected.filter(([type,name])=>!actual.has(`${type}:${name}`)).map(([,name])=>name);
  return {...base,missingConstraints,historicalConstraintCount:expected.length,historicalReady:base.ready&&missingConstraints.length===0};
}
export async function migrationStatus(pool: Pool) {
  const files = await migrationFiles();
  const [tables] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations'");
  const applied = Number(tables[0]?.count) ? await rows<RowDataPacket>(pool, 'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version') : [];
  const legacy=applied.some(row=>String(row.version)==='001' && row.checksum===LEGACY_001_CHECKSUM);
  const historical=legacy?await historicalSchemaCheck(pool):null;
  return files.map(file => {
    const row=applied.find(item=>item.version===file.version)??null;
    const state=classifyMigration(file.version,file.checksum,row?String(row.checksum??''):null,historical?.historicalReady??false);
    return {version:file.version,name:file.name,checksum:file.checksum,applied:row,state,schemaEvidence:file.version==='001'&&legacy?historical:null};
  });
}
export async function preparedMigrationStatus(pool:Pool){
  const names=['002_social_platforms_and_accounts.sql','003_product_social_account_reference.sql','004_product_variant_media.sql'] as const;
  const files=await Promise.all(names.map(async name=>({version:name.slice(0,3),name,checksum:createHash('sha256').update(await readFile(join(dir,'prepared',name))).digest('hex')})));
  const [tableRows]=await pool.query<RowDataPacket[]>("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migrations'");
  const ledger=tableRows.length?await rows<RowDataPacket>(pool,"SELECT version,name,checksum FROM schema_migrations WHERE version IN ('002','003','004')"):[];
  const columns=await rows<RowDataPacket>(pool,"SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='social_platforms' AND COLUMN_NAME IN ('id','platform_code','name','icon_key','sort_order')) OR (TABLE_NAME='social_links' AND COLUMN_NAME IN ('platform_id','description')) OR (TABLE_NAME='product_purchase_links' AND COLUMN_NAME='social_link_id') OR (TABLE_NAME='product_variants' AND COLUMN_NAME='media_id'))");
  const available=new Set(columns.map(row=>`${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  const constraints=await rows<RowDataPacket>(pool,"SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_TYPE='FOREIGN KEY' AND CONSTRAINT_NAME IN ('fk_social_links_platform','fk_product_purchase_links_social_link','fk_product_variants_media')");
  const foreign=new Set(constraints.map(row=>String(row.CONSTRAINT_NAME)));
  const checks={
    '002':['social_platforms.id','social_platforms.platform_code','social_platforms.name','social_platforms.icon_key','social_platforms.sort_order','social_links.platform_id','social_links.description'].every(value=>available.has(value))&&foreign.has('fk_social_links_platform'),
    '003':available.has('product_purchase_links.social_link_id')&&foreign.has('fk_product_purchase_links_social_link'),
    '004':available.has('product_variants.media_id')&&foreign.has('fk_product_variants_media'),
  } as Record<string,boolean>;
  if(checks['002']){
    const state=(await rows<RowDataPacket>(pool,"SELECT (SELECT COUNT(*) FROM social_links WHERE platform_id IS NULL) AS unmapped,(SELECT COUNT(DISTINCT platform_code) FROM social_platforms WHERE platform_code IN ('instagram','whatsapp','youtube','linkedin','tiktok','facebook','x','github','pinterest','threads','discord','telegram')) AS platforms"))[0];
    checks['002']=Number(state?.unmapped)===0&&Number(state?.platforms)===12;
  }
  return files.map(file=>{
    const row=ledger.find(item=>String(item.version)===file.version);
    const structureCandidate=checks[file.version]??false;
    const state=row&&row.checksum!==file.checksum?'unknown_checksum':!structureCandidate?'schema_incomplete':row?'registered_effects_candidate':'external_effects_candidate_ledger_pending';
    return {...file,state,structureCandidate,ledger:row??null,exactV2EquivalenceVerified:false};
  });
}
export async function runMigrations(config: Config) {
  const ssl = databaseTlsOptions(config);
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
        if (found[0]?.checksum && found[0].checksum !== file.checksum) {
          const compatibility=file.version==='001' && file.checksum===CURRENT_001_CHECKSUM && found[0].checksum===LEGACY_001_CHECKSUM
            ?(await historicalSchemaCheck(conn)).historicalReady:false;
          if(!compatibility)throw new Error(`Migration ${file.version} checksum mismatch`);
        }
        if (!found[0]?.checksum) {
          if (file.version !== '001')throw new Error(`Migration ${file.version} has no checksum; manual reconciliation required`);
          if (!(await historicalSchemaCheck(conn)).historicalReady)throw new Error('Cannot adopt migration 001: complete historical schema evidence is missing');
          await conn.execute('UPDATE schema_migrations SET checksum = ? WHERE version = ? AND checksum IS NULL', [file.checksum, file.version]);
        }
      } else {
        await conn.query(file.sql);
        await conn.execute('INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)', [file.version, file.name, file.checksum]);
      }
    }
    return files.length;
  } finally {
    if (locked) await conn.query("SELECT RELEASE_LOCK('uni_inside_cms_migration')");
    await conn.end();
  }
}
