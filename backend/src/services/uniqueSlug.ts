import type { Executor } from '../database/pool';
import { rows } from '../database/pool';
import { HttpError } from '../utils/http';

const slugTables = new Set(['partners','team_members','product_categories','products','service_categories','services','projects','news_categories','news_articles']);

export function slugCandidate(base: string, suffix: number) {
  const ending = suffix === 1 ? '' : `-${suffix}`;
  return `${base.slice(0, 190 - ending.length).replace(/-+$/, '')}${ending}`;
}
export async function insertWithUniqueSlug<T>(db: Executor, table: string, base: string, insert: (slug: string) => Promise<T>) {
  if (!slugTables.has(table)) throw new Error('Unsupported slug table');
  for (let suffix = 1; suffix <= 1000; suffix++) {
    const slug = slugCandidate(base, suffix);
    if ((await rows(db, `SELECT id FROM ${table} WHERE slug=? LIMIT 1`, [slug])).length) continue;
    try { return await insert(slug); }
    catch (error) {
      const dbError = error as { code?: string; sqlMessage?: string; message?: string };
      if (dbError.code !== 'ER_DUP_ENTRY' || !String(dbError.sqlMessage ?? dbError.message).includes(`uq_${table}_slug`)) throw error;
    }
  }
  throw new HttpError(409, 'ALREADY_EXISTS', 'This title has too many matching URL slugs.');
}
