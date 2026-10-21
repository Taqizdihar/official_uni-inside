import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {migrationFiles} from '../src/database/migrations';
import {resources} from '../src/schemas/resources';
import {productFormInput} from '../src/services/productCreate';

const preparedDir='migrations/prepared';
const read=(name:string)=>readFileSync(`${preparedDir}/${name}`,'utf8');

describe('inactive Phase 1 migration preparation',()=>{
  it('keeps migration 001 byte-identical to its only committed version',()=>{
    const checksum=createHash('sha256').update(readFileSync('migrations/001_initial_schema.sql')).digest('hex');
    expect(checksum).toBe('cd4f1a594f7fe56f560d0854c389262d19b8014e2d40f0c22f11088a0bc22e99');
  });
  it('stages ordered, unique forward files outside the active runner directory',async()=>{
    const names=readdirSync(preparedDir).sort();
    expect(names).toEqual([
      '002_social_platforms_and_accounts.sql',
      '003_product_social_account_reference.sql',
      '004_product_variant_media.sql',
    ]);
    expect(new Set(names.map(name=>name.slice(0,3))).size).toBe(3);
    expect(names.every(name=>/^\d{3}_[\w-]+\.sql$/.test(name))).toBe(true);
    expect((await migrationFiles()).map(file=>file.version)).toEqual(['001']);
  });
  it('rejects unknown live account codes and preserves legacy account values',()=>{
    const sql=read('002_social_platforms_and_accounts.sql');
    expect(sql).toMatch(/CREATE TEMPORARY TABLE migration_002_code_guard[\s\S]*?CHECK \(valid = 1\)/);
    expect(sql).toMatch(/LOWER\(platform_code\) NOT IN/);
    for(const code of ['instagram_studio','instagram_craft','tiktok_studio','tiktok_craft','linkedin','whatsapp'])expect(sql).toContain(`'${code}'`);
    expect(sql).toMatch(/SET account\.platform_id = platform\.id,\s*account\.updated_at = account\.updated_at/);
    expect(sql).toMatch(/CREATE TEMPORARY TABLE migration_002_mapping_guard/);
    expect(sql).toMatch(/platform_id BIGINT UNSIGNED NULL/);
    expect(sql).toMatch(/description VARCHAR\(1000\) NULL/);
    expect(sql).toMatch(/idx_social_links_platform_active_order \(platform_id, is_active, sort_order\)/);
    expect(sql).toMatch(/FOREIGN KEY \(platform_id\) REFERENCES social_platforms \(id\)/);
    expect(sql).not.toMatch(/ALTER TABLE social_links[\s\S]*DROP COLUMN/);
  });
  it('adds only nullable references with reviewed foreign-key targets',()=>{
    const purchase=read('003_product_social_account_reference.sql');
    const variant=read('004_product_variant_media.sql');
    expect(purchase).toMatch(/social_link_id BIGINT UNSIGNED NULL/);
    expect(purchase).toMatch(/FOREIGN KEY \(social_link_id\) REFERENCES social_links \(id\)/);
    expect(purchase).toMatch(/ON UPDATE CASCADE ON DELETE RESTRICT/);
    expect(variant).toMatch(/media_id BIGINT UNSIGNED NULL/);
    expect(variant).toMatch(/FOREIGN KEY \(media_id\) REFERENCES media_assets \(id\)/);
    expect(variant).toMatch(/ON UPDATE CASCADE ON DELETE SET NULL/);
    for(const sql of [purchase,variant])expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
  });
  it('keeps the DBeaver preflight and verification scripts read-only',()=>{
    for(const name of ['../docs/database-migration-preflight.sql','../docs/database-migration-verification.sql']){
      const sql=readFileSync(name,'utf8').replace(/^--.*$/gm,'').trim();
      expect(sql).not.toMatch(/\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|GRANT|CALL|SET)\s+(?:TABLE|DATABASE|INTO|FROM|ROLE|SESSION|GLOBAL)\b/i);
      expect(sql.split(';').map(statement=>statement.trim()).filter(Boolean).every(statement=>statement.startsWith('SELECT'))).toBe(true);
    }
  });
  it('leaves deployed product and social resource contracts untouched',()=>{
    expect(resources['social-links']?.fields).toHaveProperty('platform_code');
    expect(resources['social-links']?.fields).toHaveProperty('url');
    expect(resources['product-purchase-links']?.fields).toHaveProperty('url');
    expect(resources['product-variants']?.fields).not.toHaveProperty('media_id');
    expect(()=>productFormInput({action:'draft',name:'Product',variants:[{name:'Blue',price:1,stock_quantity:null,is_active:true,media_id:8}]})).toThrow('Foto varian belum dapat disimpan');
  });
});
