import type { Pool, PoolConnection } from 'mysql2/promise';
import { transaction } from '../database/pool';
import * as content from '../repositories/content';
import { audit, revision } from '../repositories/audit';
import { fixedKeyAllowed, inputSchema, resources, slugify, type ResourceSpec } from '../schemas/resources';
import { HttpError, parse } from '../utils/http';
import { sanitizeServiceDescription, serviceSummary } from './serviceCreation';
import { productSummary,sanitizeProductDescription } from '../utils/productDescription';
import { sanitizeNewsBody, suggestedNewsMinutes } from '../utils/newsText';
import { insertWithUniqueSlug } from './uniqueSlug';
import { mediaSectionForPermission, validateMediaIds } from './mediaReferences';
import {protectedAboutTeamResource} from './aboutTeam';
import {validateCollectionMedia} from './homepageCollections';
import {validatePartner,validateTeamMember,type PartnerInput,type TeamMemberInput} from '../contracts/aboutTeam';

type Actor = { id: number; permissions: Set<string> };
const authorColumns = new Set(['partners','team_members','products','services','projects','achievements']);
export function getResource(name: string) {
  const spec = Object.hasOwn(resources, name) ? resources[name] : undefined;
  if (!spec) throw new HttpError(404, 'NOT_FOUND', 'Content resource not found.');
  return spec;
}
export function permissionFor(spec: ResourceSpec, operation: 'view'|'create'|'update'|'delete') {
  if (spec.permission === 'settings' || spec.permission === 'homepage') return `${spec.permission}.${operation === 'view' ? 'view' : 'update'}`;
  return `${spec.permission}.${operation === 'delete' ? 'archive' : operation}`;
}
function checkPermission(actor: Actor, permission: string) {
  if (!actor.permissions.has(permission)) throw new HttpError(403, 'FORBIDDEN', 'You do not have permission for this action.');
}
function validateServiceCtaPair(item: Record<string, unknown>) {
  const label = String(item.primary_cta_label ?? '').trim();
  const href = String(item.primary_cta_url ?? '').trim();
  if (Boolean(label) !== Boolean(href)) throw new HttpError(400, 'VALIDATION_ERROR', 'Isi label dan URL tombol utama bersama-sama.', [{ path: label ? 'primary_cta_url' : 'primary_cta_label', message: 'Isi label dan URL tombol utama bersama-sama.' }]);
}
export function parseBody(spec: ResourceSpec, value: unknown) {
  const data = parse(inputSchema(spec), value) as Record<string, unknown>;
  if (!Object.keys(data).length) throw new HttpError(400, 'VALIDATION_ERROR', 'Provide at least one editable field.');
  const result=Object.fromEntries(Object.entries(data).map(([key, item]) => {
    if (typeof item === 'boolean') return [key, item ? 1 : 0];
    if (key === 'scheduled_at' && typeof item === 'string') return [key, new Date(item).toISOString().slice(0, 23).replace('T', ' ')];
    if (key === 'description' && spec.table === 'services' && typeof item === 'string') return [key, sanitizeServiceDescription(item)];
    if(spec.table==='products'&&key==='description'&&typeof item==='string')return [key,sanitizeProductDescription(item,true)];
    if (key === 'body' && typeof item === 'string' && spec.table === 'news_articles') return [key, sanitizeNewsBody(item)];
    return [key, item];
  }));
  if (spec.table === 'services' && typeof result.description === 'string' && data.short_description === undefined) result.short_description = serviceSummary(result.description);
  if(spec.table==='products'&&typeof result.description==='string'&&data.short_description===undefined)result.short_description=productSummary(result.description);
  return result;
}
export function publishProblems(name: string, item: Record<string, unknown>, extras: { purchaseLinks?: number } = {}) {
  const missing: string[] = [];
  const need = (field: string, message = field) => { if (item[field] == null || typeof item[field]==='string'&&!String(item[field]).trim()) missing.push(message); };
  if (name === 'team-members') { need('full_name','name'); need('slug'); need('role_title','role'); need('short_bio','biography'); need('photo_media_id','photo'); }
  if (name === 'partners') { need('name'); need('slug'); need('logo_media_id','logo'); }
  if (name === 'products') { need('name'); need('slug'); need('product_type','type'); need('short_description'); need('category_id','category'); need('cover_media_id','cover image'); if (item.base_price == null && !item.price_note) missing.push('price or pricing note'); if (!extras.purchaseLinks) missing.push('purchase/contact link'); }
  if (name === 'services') { need('name'); need('slug'); need('short_description'); need('category_id','category'); need('cover_media_id','cover image'); }
  if (name === 'projects') { need('title'); need('slug'); need('short_description'); need('cover_media_id','cover image'); }
  if (name === 'news') { need('title'); need('slug'); need('excerpt'); need('body'); need('category_id','category'); if (!item.author_user_id && !item.author_team_member_id) missing.push('author'); need('cover_media_id','cover image'); }
  if (name === 'achievements') { need('title'); if (!item.year_label && !item.achievement_date && !item.description) missing.push('date, year, or supporting description'); }
  if (item.status === 'scheduled' && (!item.scheduled_at || new Date(String(item.scheduled_at).replace(' ', 'T') + (String(item.scheduled_at).includes('Z') ? '' : 'Z')).getTime() <= Date.now())) missing.push('future scheduled date');
  return missing;
}
async function validatePublish(db: PoolConnection, name: string, data: Record<string, unknown>, id?: number,mediaRoot='uni-inside') {
  const extras = name === 'products' && id ? { purchaseLinks: await content.activePurchaseLinkCount(db, id) } : {};
  const missing = publishProblems(name, data, extras);
  if (missing.length) throw new HttpError(400, 'PUBLISH_INCOMPLETE', `Complete these fields before publishing: ${missing.join(', ')}.`, missing);
  if(name==='team-members'||name==='partners'){
    const issues=name==='team-members'
      ?validateTeamMember({...data,photo_media_id:Number(data.photo_media_id)} as TeamMemberInput)
      :validatePartner({...data,logo_media_id:Number(data.logo_media_id)} as PartnerInput);
    if(issues.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai.',issues);
    await validateCollectionMedia(db,Number(data[name==='team-members'?'photo_media_id':'logo_media_id']),name,mediaRoot);
  }
}
function recordKey(name: string, spec: ResourceSpec, key: string) {
  if (spec.kind === 'fixed') {
    if (!fixedKeyAllowed(name, key)) throw new HttpError(404, 'NOT_FOUND', 'Fixed content slot not found.');
    return spec.key === 'slot' || spec.key === 'id' ? Number(key) : key;
  }
  const value = Number(key);
  if (!Number.isSafeInteger(value) || value <= 0) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid record ID.');
  return value;
}
export async function get(db: Pool, name: string, key: string) {
  const spec = getResource(name);
  const result = await content.record(db, spec, recordKey(name, spec, key));
  if (!result) throw new HttpError(404, 'NOT_FOUND', 'Content record not found.');
  return result;
}
export async function create(db: Pool, name: string, raw: unknown, actor: Actor, requestId: string, mediaRoot = 'uni-inside') {
  const spec = getResource(name);
  if (spec.kind !== 'dynamic') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Fixed content cannot be created.');
  checkPermission(actor, permissionFor(spec,'create'));
  const data = { ...spec.defaults, ...parseBody(spec, raw) };
  if(name==='achievements'){
    if(Object.hasOwn(data,'sort_order'))throw new HttpError(400,'VALIDATION_ERROR','Gunakan pengurutan Achievement khusus.');
    if(!String(data.description??'').trim()||!data.year_label&&!data.achievement_date)throw new HttpError(400,'VALIDATION_ERROR','Isi deskripsi dan tahun atau tanggal Achievement.');
  }
  const autoSlug = Boolean(spec.fields.slug && spec.titleField && !data.slug);
  if (name === 'services') validateServiceCtaPair(data);
  for (const field of spec.required ?? []) if (!data[field]) throw new HttpError(400, 'VALIDATION_ERROR', `Please provide ${field}.`);
  if (autoSlug) data.slug = slugify(String(data[spec.titleField!]));
  if (autoSlug && !data.slug) throw new HttpError(400, 'VALIDATION_ERROR', 'Use a title that produces a valid URL slug.');
  if (spec.fields.status && data.status && data.status !== 'draft') throw new HttpError(400, 'VALIDATION_ERROR', 'Create a draft before publishing.');
  const result = await transaction(db, async conn => {
    const section=mediaSectionForPermission(spec.permission);
    if(section)await validateMediaIds(conn,Object.entries(data).filter(([key])=>key==='media_id'||key.endsWith('_media_id')).map(([,value])=>Number(value)).filter(Boolean),section,mediaRoot);
    if (spec.maxRows && await content.countRecords(conn, spec) >= spec.maxRows) throw new HttpError(409, 'ROW_LIMIT', `This resource allows at most ${spec.maxRows} entries.`);
    if (authorColumns.has(spec.table)) { data.created_by = actor.id; data.updated_by = actor.id; }
    if (name === 'news' && data.body && data.reading_time_minutes == null) data.reading_time_minutes = suggestedNewsMinutes(String(data.body));
    const id = autoSlug ? await insertWithUniqueSlug(conn,spec.table,String(data.slug),slug=>content.insertRecord(conn,spec,{...data,slug})) : await content.insertRecord(conn, spec, data);
    const saved = await content.record(conn, spec, id, true);
    await revision(conn, { entityType: spec.table, entityId: id, snapshot: saved, actorId: actor.id, summary: 'Created' });
    await audit(conn, { actorId: actor.id, action: `${spec.table}.create`, entityType: spec.table, entityId: id, requestId, after: saved });
    return saved;
  });
  return result;
}
export async function update(db: Pool, name: string, key: string, raw: unknown, actor: Actor, requestId: string, mediaRoot = 'uni-inside') {
  const spec = getResource(name);
  checkPermission(actor, permissionFor(spec,'update'));
  if(name==='page-settings')throw new HttpError(409,'LEGACY_ROUTE_DISABLED','Gunakan editor Halaman Lanjutan untuk mengubah pengaturan halaman.');
  if(protectedAboutTeamResource(name,key))throw new HttpError(409,'LEGACY_ROUTE_DISABLED','Gunakan editor Our Team atau About Us untuk mengubah konten ini.');
  const data = parseBody(spec, raw);
  if(name==='achievements'&&Object.hasOwn(data,'sort_order'))throw new HttpError(400,'VALIDATION_ERROR','Gunakan pengurutan Achievement khusus.');
  const resolvedKey = recordKey(name, spec, key);
  return transaction(db, async conn => {
    const section=mediaSectionForPermission(spec.permission);
    if(section)await validateMediaIds(conn,Object.entries(data).filter(([key])=>key==='media_id'||key.endsWith('_media_id')).map(([,value])=>Number(value)).filter(Boolean),section,mediaRoot);
    const before = await content.record(conn, spec, resolvedKey, true);
    if (!before) throw new HttpError(404, 'NOT_FOUND', 'Content record not found.');
    if (spec.fields.status && ['published','scheduled','archived'].includes(String(before.status)) && !actor.permissions.has(`${spec.permission}.publish`)) throw new HttpError(403,'FORBIDDEN','Only a publisher can edit a non-draft record.');
    if (spec.childOf && data[spec.childOf.foreignKey] != null && Number(data[spec.childOf.foreignKey]) !== Number(before[spec.childOf.foreignKey])) throw new HttpError(400, 'VALIDATION_ERROR', 'A child record cannot be moved to a different parent.');
    if (name === 'product-purchase-links' && data.is_active === 0 && Number(before.is_active) === 1) {
      const parent = await content.record(conn,resources.products!,Number(before.product_id),true);
      if (parent?.status === 'published' && await content.activePurchaseLinkCount(conn,Number(before.product_id)) <= 1) throw new HttpError(409,'PUBLISH_INCOMPLETE','Published products need a purchase/contact link.');
    }
    if (spec.fields.status && data.status && data.status !== before.status) {
      if (data.status === 'published' || data.status === 'scheduled') checkPermission(actor, `${spec.permission}.publish`);
      if (data.status === 'archived') checkPermission(actor, `${spec.permission}.archive`);
      if (data.status === 'draft' && ['published','scheduled'].includes(String(before.status))) checkPermission(actor, `${spec.permission}.publish`);
    }
    if (name === 'services' && data.featured_slot != null) {
      const owner = await content.featuredServiceOwner(conn, Number(data.featured_slot));
      if (owner && Number(owner.id) !== Number(resolvedKey)) throw new HttpError(409, 'FEATURED_SLOT_TAKEN', 'This featured service slot is already assigned.');
    }
    const proposed = { ...before, ...data } as Record<string, unknown>;
    if(name==='achievements'&&(!String(proposed.description??'').trim()||!proposed.year_label&&!proposed.achievement_date))throw new HttpError(400,'VALIDATION_ERROR','Isi deskripsi dan tahun atau tanggal Achievement.');
    if (name === 'services' && (data.primary_cta_label !== undefined || data.primary_cta_url !== undefined)) validateServiceCtaPair(proposed);
    if (proposed.status === 'published' || proposed.status === 'scheduled') await validatePublish(conn, name, proposed, Number(resolvedKey),mediaRoot);
    if (data.status === 'published' && before.status !== 'published'&&['products','services','projects','news_articles'].includes(spec.table)) data.published_at = new Date().toISOString().slice(0,23).replace('T',' ');
    if (name === 'news' && data.body != null && data.reading_time_minutes === null) data.reading_time_minutes = suggestedNewsMinutes(String(data.body));
    if (authorColumns.has(spec.table) || spec.kind === 'fixed') data.updated_by = actor.id;
    await content.updateRecord(conn, spec, resolvedKey, data);
    const after = await content.record(conn, spec, resolvedKey);
    const entityType = spec.kind === 'fixed' ? `${spec.table}:${key}` : spec.table;
    const entityId = typeof resolvedKey === 'number' ? resolvedKey : 0;
    await revision(conn, { entityType, entityId, snapshot: after, actorId: actor.id, summary: 'Updated' });
    await audit(conn, { actorId: actor.id, action: `${spec.table}.update`, entityType, entityId, requestId, before, after });
    return { ...after, ...(before.slug && data.slug && before.slug !== data.slug ? { urlChange: { previous: before.slug, current: data.slug } } : {}) };
  });
}
export async function remove(db: Pool, name: string, key: string, actor: Actor, requestId: string) {
  const spec = getResource(name);
  if (spec.kind !== 'dynamic') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Fixed content cannot be deleted.');
  checkPermission(actor, permissionFor(spec,'delete'));
  const resolvedKey = recordKey(name, spec, key);
  return transaction(db, async conn => {
    const before = await content.record(conn, spec, resolvedKey, true);
    if (!before) throw new HttpError(404, 'NOT_FOUND', 'Content record not found.');
    if (name === 'product-purchase-links' && Number(before.is_active) === 1) {
      const parent = await content.record(conn,resources.products!,Number(before.product_id),true);
      if (parent?.status === 'published' && await content.activePurchaseLinkCount(conn,Number(before.product_id)) <= 1) throw new HttpError(409,'PUBLISH_INCOMPLETE','Published products need a purchase/contact link.');
    }
    const categoryParents: Record<string,'products'|'services'|'news_articles'> = {'product-categories':'products','service-categories':'services','news-categories':'news_articles'};
    // The category row is locked above. Foreign-key inserts must wait for this
    // transaction, so a new referencing record cannot slip past the check.
    if (categoryParents[name] && await content.categoryReferenceCount(conn,categoryParents[name],Number(resolvedKey))) throw new HttpError(409,'CATEGORY_IN_USE','Kategori ini masih digunakan oleh beberapa konten. Pindahkan konten tersebut ke kategori lain sebelum menghapusnya.');
    await content.deleteRecord(conn, spec, resolvedKey);
    await revision(conn,{entityType:spec.table,entityId:Number(resolvedKey),snapshot:{...before,deleted:true},actorId:actor.id,summary:'Deleted'});
    await audit(conn, { actorId: actor.id, action: `${spec.table}.delete`, entityType: spec.table, entityId: Number(resolvedKey), requestId, before });
    return { deleted: true };
  });
}
