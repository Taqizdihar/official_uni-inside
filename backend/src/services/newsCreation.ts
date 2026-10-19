import type { Pool, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { rows, transaction, write } from '../database/pool';
import { audit, revision } from '../repositories/audit';
import { record } from '../repositories/content';
import { resources, slugify } from '../schemas/resources';
import { HttpError, parse } from '../utils/http';
import { readableNewsText, sanitizeNewsBody, suggestedNewsMinutes } from '../utils/newsText';

const id = z.number().int().positive();
const author = z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('user'), id }),
  z.strictObject({ source: z.literal('team'), id }),
]);
export const newsCreateSchema = z.strictObject({
  action: z.enum(['draft', 'publish']),
  title: z.string().trim().min(1).max(255),
  content_type: z.enum(['news', 'article', 'update', 'event']),
  category_id: id.nullable(),
  excerpt: z.string().trim().max(1000),
  body: z.string().max(80_000),
  cover_media_id: id.nullable(),
  gallery_media_ids: z.array(id).max(100),
  author: author.nullable(),
  reading_time_minutes: z.number().int().min(1).max(999).nullable(),
});

export function validateNewsCreate(raw: unknown, canPublish: boolean) {
  const input = parse(newsCreateSchema, raw);
  if (input.action === 'publish' && !canPublish) throw new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki izin menerbitkan artikel.');
  const body = sanitizeNewsBody(input.body);
  const readable = readableNewsText(body);
  const minutes = input.reading_time_minutes ?? suggestedNewsMinutes(body);
  const issues: { path: string; message: string }[] = [];
  const fail = (path: string, message: string) => issues.push({ path, message });
  const mediaIds = [input.cover_media_id, ...input.gallery_media_ids].filter((value): value is number => value !== null);
  if (new Set(mediaIds).size !== mediaIds.length) fail('gallery_media_ids', 'Satu gambar hanya dapat digunakan sekali.');
  if (input.action === 'publish') {
    if (!input.category_id) fail('category_id', 'Pilih kategori sebelum menerbitkan.');
    if (!input.excerpt) fail('excerpt', 'Isi ringkasan sebelum menerbitkan.');
    if (!readable) fail('body', 'Isi artikel sebelum menerbitkan.');
    if (!input.cover_media_id) fail('cover_media_id', 'Pilih gambar sampul sebelum menerbitkan.');
    if (!input.author) fail('author', 'Pilih penulis sebelum menerbitkan.');
  }
  if (issues.length) throw new HttpError(400, 'PUBLISH_INCOMPLETE', 'Lengkapi artikel sebelum menerbitkan.', issues);
  return { ...input, body, reading_time_minutes: minutes };
}

export async function articleAuthorOptions(db: Pool, source: 'user' | 'team', limit: number, offset: number) {
  const user = source === 'user';
  const table = user ? 'users' : 'team_members';
  const name = user ? 'display_name' : 'full_name';
  const where = user ? "status='active' AND deleted_at IS NULL" : "status='published' AND deleted_at IS NULL";
  const [items, count] = await Promise.all([
    rows<RowDataPacket>(db, `SELECT id,${name} AS name FROM ${table} WHERE ${where} ORDER BY ${name},id LIMIT ? OFFSET ?`, [limit, offset]),
    rows<RowDataPacket>(db, `SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`),
  ]);
  return { items: items.map(item => ({ source, id: Number(item.id), name: String(item.name) })), total: Number(count[0]?.total ?? 0) };
}

export async function createNewsArticle(db: Pool, raw: unknown, actor: { id: number; permissions: Set<string> }, requestId: string, mediaRoot = 'uni-inside') {
  if (!actor.permissions.has('news.create')) throw new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki izin membuat artikel.');
  const input = validateNewsCreate(raw, actor.permissions.has('news.update') && actor.permissions.has('news.publish'));
  return transaction(db, async conn => {
    if (input.category_id) {
      const category = await rows<RowDataPacket>(conn, 'SELECT id FROM news_categories WHERE id=? AND is_active=1 LIMIT 1', [input.category_id]);
      if (!category.length) throw new HttpError(400, 'INVALID_REFERENCE', 'Kategori tidak tersedia.', [{ path: 'category_id', message: 'Pilih kategori aktif.' }]);
    }
    if (input.author) {
      const user = input.author.source === 'user';
      const table = user ? 'users' : 'team_members';
      const status = user ? 'active' : 'published';
      const found = await rows<RowDataPacket>(conn, `SELECT id FROM ${table} WHERE id=? AND status=? AND deleted_at IS NULL LIMIT 1`, [input.author.id, status]);
      if (!found.length) throw new HttpError(400, 'INVALID_REFERENCE', 'Penulis tidak tersedia.', [{ path: 'author', message: 'Pilih penulis yang tersedia.' }]);
    }
    const mediaIds = [input.cover_media_id, ...input.gallery_media_ids].filter((value): value is number => value !== null);
    const mediaById = new Map<number, RowDataPacket>();
    if (mediaIds.length) {
      const folder = `${mediaRoot}/news`;
      const media = await rows<RowDataPacket>(conn, `SELECT id,alt_text,caption FROM media_assets WHERE id IN (${mediaIds.map(() => '?').join(',')}) AND deleted_at IS NULL AND resource_type='image' AND (folder_path=? OR folder_path LIKE ?)`, [...mediaIds, folder, `${folder}/%`]);
      for (const item of media) mediaById.set(Number(item.id), item);
      if (mediaById.size !== mediaIds.length) throw new HttpError(400, 'INVALID_MEDIA', 'Gambar artikel tidak tersedia.', [{ path: 'gallery_media_ids', message: 'Pilih gambar dari folder Berita yang masih tersedia.' }]);
    }
    const base = slugify(input.title).replace(/-+$/, '');
    if (!base) throw new HttpError(400, 'VALIDATION_ERROR', 'Judul harus menghasilkan alamat URL yang valid.', [{ path: 'title', message: 'Gunakan huruf atau angka pada judul.' }]);
    let slug = base;
    for (let suffix = 2; suffix <= 999; suffix++) {
      const exists = await rows<RowDataPacket>(conn, 'SELECT id FROM news_articles WHERE slug=? LIMIT 1', [slug]);
      if (!exists.length) break;
      slug = `${base.slice(0, 190 - String(suffix).length - 1).replace(/-+$/, '')}-${suffix}`;
      if (suffix === 999) throw new HttpError(409, 'ALREADY_EXISTS', 'Judul ini terlalu sering digunakan.');
    }
    const status = input.action === 'publish' ? 'published' : 'draft';
    const result = await write(conn, `INSERT INTO news_articles
      (category_id,author_user_id,author_team_member_id,title,slug,content_type,excerpt,body,cover_media_id,status,reading_time_minutes,published_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [
      input.category_id, input.author?.source === 'user' ? input.author.id : null,
      input.author?.source === 'team' ? input.author.id : null,
      input.title, slug, input.content_type, input.excerpt, input.body || null,
      input.cover_media_id, status, input.reading_time_minutes,
      status === 'published' ? new Date().toISOString().slice(0, 23).replace('T', ' ') : null,
    ]);
    const articleId = Number(result.insertId);
    for (const [index, mediaId] of input.gallery_media_ids.entries()) {
      const image = mediaById.get(mediaId)!;
      await write(conn, 'INSERT INTO news_images (article_id,media_id,alt_text,caption,sort_order) VALUES (?,?,?,?,?)', [articleId, mediaId, image.alt_text ?? null, image.caption ?? null, index]);
    }
    const saved = await record(conn, resources.news!, articleId);
    const snapshot = { ...saved, gallery_media_ids: input.gallery_media_ids };
    await revision(conn, { entityType: 'news_articles', entityId: articleId, snapshot, actorId: actor.id, summary: 'Created with article images' });
    await audit(conn, { actorId: actor.id, action: 'news_articles.create', entityType: 'news_articles', entityId: articleId, requestId, after: snapshot });
    return snapshot;
  });
}
