import { describe, expect, it } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { articleAuthorOptions, createNewsArticle, validateNewsCreate } from '../src/services/newsCreation';
import { readableNewsText, sanitizeNewsBody, suggestedNewsMinutes } from '../src/utils/newsText';
import { parseBody, update } from '../src/services/content';
import { publicDetail } from '../src/repositories/content';
import { resources } from '../src/schemas/resources';

const basic = {
  action: 'draft', title: 'Cerita Studio', content_type: 'article', category_id: 3,
  excerpt: 'Ringkasan editorial', body: '<p><b>Kalimat</b> aman.</p>', cover_media_id: 11,
  gallery_media_ids: [12, 13], author: { source: 'user', id: 7 }, reading_time_minutes: 8,
};
const actor = { id: 7, permissions: new Set(['news.create', 'news.update', 'news.publish']) };
function database(failChild = false) {
  const calls: { sql: string; values: unknown[] }[] = [];
  let committed = false, rolledBack = false, slugChecks = 0;
  const conn = {
    beginTransaction: async () => {}, commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; }, release: () => {},
    execute: async (options: { sql: string }, values: unknown[] = []) => {
      const sql = options.sql; calls.push({ sql, values });
      if (sql.includes('FROM news_categories')) return [[{ id: 3 }], []];
      if (sql.includes('FROM users WHERE id=')) return [[{ id: 7 }], []];
      if (sql.includes('FROM team_members WHERE id=')) return [[{ id: 9 }], []];
      if (sql.includes('FROM media_assets WHERE id IN')) return [[{ id: 11, alt_text: 'Sampul' }, { id: 12, alt_text: 'Visual kedua', caption: 'Keterangan' }, { id: 13, alt_text: null, caption: null }], []];
      if (sql.startsWith('SELECT id FROM news_articles WHERE slug=')) return [slugChecks++ === 0 ? [] : [], []];
      if (sql.startsWith('INSERT INTO news_articles')) return [{ insertId: 42 }, []];
      if (sql.startsWith('INSERT INTO news_images') && failChild && Number(values[1]) === 13) throw new Error('child insert failed');
      if (sql.includes('FROM `news_articles`')) return [[{ id: 42, title: basic.title, status: 'draft', reading_time_minutes: 8 }], []];
      if (sql.includes('MAX(revision_number)')) return [[{ next: 1 }], []];
      return [{ affectedRows: 1 }, []];
    },
  };
  return { db: { getConnection: async () => conn } as unknown as Pool, calls, state: () => ({ committed, rolledBack }) };
}

describe('article creation', () => {
  it('keeps editorial formatting and counts readable words instead of tags', () => {
    const clean = sanitizeNewsBody('<h2>Judul</h2><p><b>Tebal</b> <i>Miring</i> <a href="javascript:alert(1)">tautan</a><img src="x"></p><script>alert(1)</script>');
    expect(clean).toContain('<b>Tebal</b>');
    expect(clean).toContain('<i>Miring</i>');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('<img');
    expect(readableNewsText('<p>Halo</p><p>Dunia</p>')).toBe('Halo Dunia');
    expect(suggestedNewsMinutes(`<h2>Judul</h2><p>${Array(201).fill('kata').join(' ')}</p>`)).toBe(2);
  });
  it('validates manual minutes, duplicate assets, extra fields, and publication completeness', () => {
    for (const minutes of [0, -1, 1.5, 1000]) expect(() => validateNewsCreate({ ...basic, reading_time_minutes: minutes }, true)).toThrow();
    expect(() => validateNewsCreate({ ...basic, gallery_media_ids: [11] }, true)).toThrow();
    expect(() => validateNewsCreate({ ...basic, slug: 'manual' }, true)).toThrow();
    expect(() => validateNewsCreate({ ...basic, action: 'publish', author: null }, true)).toThrow();
    expect(() => validateNewsCreate({ ...basic, action: 'publish' }, false)).toThrow();
    expect(validateNewsCreate({ ...basic, reading_time_minutes: null }, true).reading_time_minutes).toBe(1);
  });
  it('saves the chosen user author, manual minutes, and gallery order atomically', async () => {
    const test = database();
    const result = await createNewsArticle(test.db, basic, actor, 'request');
    expect(result).toMatchObject({ id: 42, gallery_media_ids: [12, 13] });
    expect(test.state()).toEqual({ committed: true, rolledBack: false });
    const insert = test.calls.find(call => call.sql.startsWith('INSERT INTO news_articles'))!;
    expect(insert.values.slice(0, 3)).toEqual([3, 7, null]);
    expect(insert.values[10]).toBe(8);
    expect(test.calls.filter(call => call.sql.startsWith('INSERT INTO news_images')).map(call => call.values)).toEqual([[42, 12, 'Visual kedua', 'Keterangan', 0], [42, 13, null, null, 1]]);
    expect(test.calls.some(call => call.sql.startsWith('INSERT INTO content_revisions'))).toBe(true);
    expect(test.calls.some(call => call.sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  });
  it('stores a team author alone and applies publish permissions', async () => {
    const test = database();
    await createNewsArticle(test.db, { ...basic, action: 'publish', author: { source: 'team', id: 9 } }, actor, 'request');
    const insert = test.calls.find(call => call.sql.startsWith('INSERT INTO news_articles'))!;
    expect(insert.values.slice(0, 3)).toEqual([3, null, 9]);
    expect(insert.values[9]).toBe('published');
    await expect(createNewsArticle(database().db, { ...basic, action: 'publish' }, { id: 7, permissions: new Set(['news.create', 'news.publish']) }, 'request')).rejects.toMatchObject({ status: 403 });
  });
  it('rolls back a later gallery failure', async () => {
    const test = database(true);
    await expect(createNewsArticle(test.db, basic, actor, 'request')).rejects.toThrow('child insert failed');
    expect(test.state()).toEqual({ committed: false, rolledBack: true });
  });
  it('returns author names only to authorized route callers', async () => {
    const db = { execute: async (options: { sql: string }) => options.sql.startsWith('SELECT COUNT') ? [[{ total: 1 }], []] : [[{ id: 7, name: 'Penulis Studio' }], []] } as unknown as Pool;
    expect(await articleAuthorOptions(db, 'user', 100, 0)).toEqual({ items: [{ source: 'user', id: 7, name: 'Penulis Studio' }], total: 1 });
    expect(await articleAuthorOptions(db, 'team', 100, 0)).toEqual({ items: [{ source: 'team', id: 7, name: 'Penulis Studio' }], total: 1 });
  });
  it('preserves manually set minutes through generic article edits', async () => {
    expect(parseBody(resources.news!, { reading_time_minutes: 8, body: '<p>Baru</p>' })).toMatchObject({ reading_time_minutes: 8 });
    const calls: { sql: string; values: unknown[] }[] = [];
    const conn = { beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {}, execute: async (options: { sql: string }, values: unknown[] = []) => {
      calls.push({ sql: options.sql, values });
      if (options.sql.includes('FROM `news_articles`')) return [[{ id: 42, status: 'draft', slug: 'cerita-studio', title: 'Cerita Studio', reading_time_minutes: 8 }], []];
      if (options.sql.includes('MAX(revision_number)')) return [[{ next: 1 }], []];
      return [{ affectedRows: 1 }, []];
    } };
    await update({ getConnection: async () => conn } as unknown as Pool, 'news', '42', { body: '<p>Isi diperbarui.</p>' }, { id: 7, permissions: new Set(['news.update']) }, 'request');
    const sql = calls.find(call => call.sql.startsWith('UPDATE `news_articles`'))!.sql;
    expect(sql).not.toContain('reading_time_minutes');
  });
  it('returns only the author display name and ordered article images on public detail', async () => {
    const db = { execute: async (options: { sql: string }) => {
      if (options.sql.includes('FROM `news_articles`')) return [[{ id: 42, title: basic.title, reading_time_minutes: 8, cover_media_id: null }], []];
      if (options.sql.includes('FROM news_images')) return [[{ secure_url: 'https://example.test/2.jpg', sort_order: 0 }, { secure_url: 'https://example.test/3.jpg', sort_order: 1 }], []];
      if (options.sql.includes('COALESCE(t.full_name,u.display_name)')) return [[{ author_name: 'Penulis Studio' }], []];
      return [[], []];
    } } as unknown as Pool;
    const result = await publicDetail(db, resources.news!, 'cerita-studio');
    expect(result).toMatchObject({ author_name: 'Penulis Studio', reading_time_minutes: 8, images: [{ sort_order: 0 }, { sort_order: 1 }] });
    expect(result).not.toHaveProperty('email');
  });
  it('refreshes gallery caption provenance when an editor replaces an image',async()=>{
    let image:{id:number;article_id:number;media_id:number;alt_text:string;caption:string|null}={id:15,article_id:42,media_id:11,alt_text:'Old image',caption:'Old caption'};
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
      if(options.sql.includes('FROM media_assets'))return [[{id:12,alt_text:'New image',caption:null}],[]];
      if(options.sql.includes('FROM `news_images`'))return [[{...image}],[]];
      if(options.sql.startsWith('UPDATE `news_images`')){image={...image,media_id:Number(values[0]),caption:values[1] as string|null,alt_text:String(values[2])};return [{affectedRows:1},[]];}
      if(options.sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
      return [{affectedRows:1},[]];
    }};
    await update({getConnection:async()=>conn} as unknown as Pool,'news-images','15',{media_id:12},{id:7,permissions:new Set(['news.update'])},'request');
    expect(image).toMatchObject({media_id:12,caption:null,alt_text:'New image'});
  });
});
