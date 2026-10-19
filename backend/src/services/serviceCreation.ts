import type { Pool } from 'mysql2/promise';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { transaction, rows, write } from '../database/pool';
import { audit, revision } from '../repositories/audit';
import { record } from '../repositories/content';
import { resources, slugify } from '../schemas/resources';
import { HttpError, parse } from '../utils/http';
import { safeServiceCtaHref } from '../utils/serviceLinks';

const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'a'];
export function sanitizeServiceDescription(value: string) {
  return sanitizeHtml(value, {
    allowedTags, allowedAttributes: { a: ['href', 'title'] }, allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: { a: (_tag, attributes) => ({ tagName: 'a', attribs: {
      ...(attributes.href && !attributes.href.startsWith('//') && !/[\s\\]/.test(attributes.href) && (/^https?:\/\//i.test(attributes.href) || /^mailto:/i.test(attributes.href) || !/^[a-z][a-z0-9+.-]*:/i.test(attributes.href)) ? { href: attributes.href } : {}),
      ...(attributes.title ? { title: attributes.title } : {}), rel: 'noopener noreferrer',
    } }) },
  });
}
export function serviceSummary(html: string) {
  const separated = html.replace(/<\/?(?:p|div|li|h[1-6]|blockquote|br)\b[^>]*>/gi, ' ');
  return sanitizeHtml(separated, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim().slice(0, 500);
}

const schema = z.strictObject({
  name: z.string().trim().min(1).max(190),
  category_id: z.number().int().positive().nullable(),
  description: z.string().max(100_000),
  cover_media_id: z.number().int().positive().nullable(),
  gallery_media_ids: z.array(z.number().int().positive()).max(8),
  pricing_type: z.enum(['contact', 'fixed', 'starting_from', 'range']),
  starting_price: z.number().finite().min(0).max(999_999_999_999).nullable(),
  currency_code: z.enum(['IDR', 'USD', 'SGD', 'EUR', 'AUD', 'MYR']),
  price_note: z.string().trim().max(255),
  estimated_duration: z.string().trim().max(255),
  items: z.array(z.strictObject({ item_type: z.enum(['deliverable', 'included', 'requirement', 'not_included']), label: z.string().trim().min(1).max(500) })).max(100),
  process_steps: z.array(z.strictObject({ title: z.string().trim().min(1).max(150), description: z.string().trim().max(1000) })).max(100),
  primary_cta_label: z.string().trim().max(100),
  primary_cta_url: z.string().max(1000),
  status: z.enum(['draft', 'published']),
});
export type ServiceCreateInput = z.infer<typeof schema>;

export function validateServiceCreate(raw: unknown, canPublish: boolean): ServiceCreateInput & { sanitizedDescription: string; summary: string } {
  const input = parse(schema, raw);
  const sanitizedDescription = sanitizeServiceDescription(input.description);
  const summary = serviceSummary(sanitizedDescription);
  const errors: { path: string; message: string }[] = [];
  const fail = (path: string, message: string) => errors.push({ path, message });
  if (input.status === 'published' && !canPublish) throw new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk menerbitkan layanan.');
  if (input.primary_cta_url && !safeServiceCtaHref(input.primary_cta_url)) fail('primary_cta_url', 'Gunakan path internal, URL HTTP(S), mailto, atau tel yang aman.');
  if (Boolean(input.primary_cta_label) !== Boolean(input.primary_cta_url)) fail(input.primary_cta_label ? 'primary_cta_url' : 'primary_cta_label', 'Isi label dan URL tombol bersama-sama.');
  const mediaIds = [input.cover_media_id, ...input.gallery_media_ids].filter((id): id is number => id !== null);
  if (new Set(mediaIds).size !== mediaIds.length) fail('gallery_media_ids', 'Setiap gambar hanya boleh dipilih sekali.');
  if (input.status === 'published') {
    if (!input.category_id) fail('category_id', 'Pilih kategori sebelum menerbitkan.');
    if (!summary) fail('description', 'Isi deskripsi sebelum menerbitkan.');
    if (!input.cover_media_id) fail('cover_media_id', 'Pilih gambar utama sebelum menerbitkan.');
    if (['fixed', 'starting_from'].includes(input.pricing_type) && (!input.starting_price || input.starting_price <= 0)) fail('starting_price', 'Isi harga yang lebih besar dari nol.');
    if (input.pricing_type === 'range' && !input.price_note) fail('price_note', 'Jelaskan rentang harga pada catatan harga.');
  }
  if (errors.length) throw new HttpError(400, 'VALIDATION_ERROR', 'Periksa kolom layanan.', errors);
  return { ...input, sanitizedDescription, summary };
}

export async function createCompleteService(db: Pool, raw: unknown, actor: { id: number; permissions: Set<string> }, requestId: string, mediaRoot = 'uni-inside') {
  if (!actor.permissions.has('services.create')) throw new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki izin untuk membuat layanan.');
  const input = validateServiceCreate(raw, actor.permissions.has('services.publish') && actor.permissions.has('services.update'));
  return transaction(db, async conn => {
    if (input.category_id) {
      const category = await rows(conn, 'SELECT id FROM service_categories WHERE id=? AND is_active=1 LIMIT 1', [input.category_id]);
      if (!category.length) throw new HttpError(400, 'VALIDATION_ERROR', 'Pilih kategori aktif.', [{ path: 'category_id', message: 'Kategori tidak tersedia.' }]);
    }
    const mediaIds = [input.cover_media_id, ...input.gallery_media_ids].filter((id): id is number => id !== null);
    if (mediaIds.length) {
      const assets = await rows(conn, `SELECT id FROM media_assets WHERE id IN (${mediaIds.map(() => '?').join(',')}) AND deleted_at IS NULL AND resource_type='image' AND folder_path LIKE ?`, [...mediaIds, `${mediaRoot}/services/%`]);
      if (assets.length !== mediaIds.length) throw new HttpError(400, 'INVALID_MEDIA', 'Pilih gambar yang masih tersedia.', [{ path: 'gallery_media_ids', message: 'Satu atau lebih gambar tidak tersedia.' }]);
    }
    const base = slugify(input.name);
    if (!base) throw new HttpError(400, 'VALIDATION_ERROR', 'Nama layanan tidak menghasilkan slug yang valid.', [{ path: 'name', message: 'Gunakan huruf atau angka pada nama layanan.' }]);
    let slug = base;
    for (let suffix = 2; suffix < 1000; suffix++) {
      const existing = await rows(conn, 'SELECT id FROM services WHERE slug=? LIMIT 1', [slug]);
      if (!existing.length) break;
      slug = `${base.slice(0, 190 - String(suffix).length - 1)}-${suffix}`;
      if (suffix === 999) throw new HttpError(409, 'ALREADY_EXISTS', 'Nama layanan sudah terlalu sering digunakan.');
    }
    const result = await write(conn, `INSERT INTO services
      (category_id,name,slug,short_description,description,pricing_type,starting_price,currency_code,price_note,estimated_duration,cover_media_id,status,primary_cta_label,primary_cta_url,published_at,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      input.category_id, input.name, slug, input.summary, input.sanitizedDescription || null,
      input.pricing_type, input.starting_price, input.currency_code, input.price_note || null,
      input.estimated_duration || null, input.cover_media_id, input.status,
      input.primary_cta_label || null, input.primary_cta_url || null,
      input.status === 'published' ? new Date().toISOString().slice(0, 23).replace('T', ' ') : null,
      actor.id, actor.id,
    ]);
    const id = Number(result.insertId);
    for (const [index, mediaId] of mediaIds.entries()) await write(conn,
      'INSERT INTO service_images (service_id,media_id,is_cover,sort_order) VALUES (?,?,?,?)',
      [id, mediaId, index === 0 && input.cover_media_id !== null ? 1 : 0, index]);
    for (const [index, item] of input.items.entries()) await write(conn,
      'INSERT INTO service_list_items (service_id,item_type,label,sort_order) VALUES (?,?,?,?)',
      [id, item.item_type, item.label, index]);
    for (const [index, step] of input.process_steps.entries()) await write(conn,
      'INSERT INTO service_process_steps (service_id,title,description,sort_order) VALUES (?,?,?,?)',
      [id, step.title, step.description || null, index]);
    const saved = await record(conn, resources.services!, id);
    const snapshot = { ...saved, gallery_media_ids: input.gallery_media_ids, items: input.items, process_steps: input.process_steps };
    await revision(conn, { entityType: 'services', entityId: id, snapshot, actorId: actor.id, summary: 'Created with service details' });
    await audit(conn, { actorId: actor.id, action: 'services.create', entityType: 'services', entityId: id, requestId, after: snapshot });
    return snapshot;
  });
}
