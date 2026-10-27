import type { RowDataPacket } from 'mysql2/promise';
import type { Executor } from '../database/pool';
import { rows, write } from '../database/pool';
import type { ResourceSpec } from '../schemas/resources';
import { sanitizeProductDescription } from '../utils/productDescription';
import {aboutPreviewDefaults} from '../contracts/aboutTeam';

const ident = (value: string) => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) throw new Error('Unsafe database identifier');
  return `\`${value}\``;
};
export type ContentFilters = { search?: string; status?: string; categoryId?: number; productType?: string; contentType?: string; parentId?: number; isActive?: boolean };
export function contentWhere(spec: ResourceSpec, filters: ContentFilters = {}) {
  const conditions = spec.softDelete ? ['deleted_at IS NULL'] : [];
  const values: unknown[] = [];
  if (filters.search) {
    const field = ['name','title','full_name','label','slug','message_text'].find(value=>Object.hasOwn(spec.fields,value));
    if (field) { conditions.push(`${ident(field)} LIKE ?`);values.push(`%${filters.search}%`); }
  }
  if (filters.status) { conditions.push('status=?'); values.push(filters.status); }
  if (filters.categoryId) { conditions.push('category_id=?');values.push(filters.categoryId); }
  if (filters.productType) { conditions.push('product_type=?');values.push(filters.productType); }
  if (filters.contentType) { conditions.push('content_type=?');values.push(filters.contentType); }
  if (filters.parentId && spec.childOf) { conditions.push(`${ident(spec.childOf.foreignKey)}=?`);values.push(filters.parentId); }
  if (filters.isActive !== undefined) { conditions.push('is_active=?'); values.push(filters.isActive ? 1 : 0); }
  return {sql:conditions.length?`WHERE ${conditions.join(' AND ')}`:'',values};
}
export async function listRecords(db: Executor, spec: ResourceSpec, limit: number, offset: number, sort: string, direction: 'ASC'|'DESC', filters: ContentFilters = {}) {
  const where=contentWhere(spec,filters);
  const order=`${ident(sort)} ${direction}${sort===spec.key?'':`, ${ident(spec.key)} ${direction}`}`;
  return rows<RowDataPacket>(db, `SELECT * FROM ${ident(spec.table)} ${where.sql} ORDER BY ${order} LIMIT ? OFFSET ?`, [...where.values,limit,offset]);
}
export async function postListingDetails(db: Executor, table: string, items: RowDataPacket[]) {
  const categories: Record<string,string> = {products:'product_categories',services:'service_categories',news_articles:'news_categories'};
  const categoryTable=categories[table];
  if (!categoryTable || !items.length) return items;
  const categoryIds=[...new Set(items.map(item=>Number(item.category_id)).filter(Boolean))];
  const mediaIds=[...new Set(items.map(item=>Number(item.cover_media_id)).filter(Boolean))];
  const userIds=table==='news_articles'?[...new Set(items.map(item=>Number(item.author_user_id)).filter(Boolean))]:[];
  const teamIds=table==='news_articles'?[...new Set(items.map(item=>Number(item.author_team_member_id)).filter(Boolean))]:[];
  const lookup=async (sql:string,ids:number[])=>ids.length?rows<RowDataPacket>(db,`${sql} (${ids.map(()=>'?').join(',')})`,ids):[];
  const [categoryRows,mediaRows,userRows,teamRows]=await Promise.all([
    lookup(`SELECT id,name FROM ${ident(categoryTable)} WHERE id IN`,categoryIds),
    lookup('SELECT id,secure_url,alt_text FROM media_assets WHERE deleted_at IS NULL AND id IN',mediaIds),
    lookup('SELECT id,display_name FROM users WHERE id IN',userIds),
    lookup('SELECT id,full_name FROM team_members WHERE id IN',teamIds),
  ]);
  const byId=(data:RowDataPacket[])=>new Map(data.map(row=>[Number(row.id),row]));
  const categoryById=byId(categoryRows),mediaById=byId(mediaRows),userById=byId(userRows),teamById=byId(teamRows);
  return items.map(item=>({
    ...item,
    category_name:categoryById.get(Number(item.category_id))?.name??null,
    image:mediaById.get(Number(item.cover_media_id))??null,
    author_name:teamById.get(Number(item.author_team_member_id))?.full_name??userById.get(Number(item.author_user_id))?.display_name??null,
  }));
}
export async function record(db: Executor, spec: ResourceSpec, key: string | number, lock = false) {
  return (await rows<RowDataPacket>(db, `SELECT * FROM ${ident(spec.table)} WHERE ${ident(spec.key)}=? ${spec.softDelete ? 'AND deleted_at IS NULL' : ''} LIMIT 1 ${lock ? 'FOR UPDATE' : ''}`, [key]))[0];
}
export async function countRecords(db: Executor, spec: ResourceSpec, filters: ContentFilters = {}) {
  const where=contentWhere(spec,filters);
  return Number((await rows<RowDataPacket>(db, `SELECT COUNT(*) AS count FROM ${ident(spec.table)} ${where.sql}`,where.values))[0]?.count ?? 0);
}
export async function insertRecord(db: Executor, spec: ResourceSpec, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  const result = await write(db, `INSERT INTO ${ident(spec.table)} (${keys.map(ident).join(',')}) VALUES (${keys.map(()=>'?').join(',')})`, keys.map(key => data[key]));
  return Number(result.insertId);
}
export async function updateRecord(db: Executor, spec: ResourceSpec, key: string | number, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  return write(db, `UPDATE ${ident(spec.table)} SET ${keys.map(k=>`${ident(k)}=?`).join(',')} WHERE ${ident(spec.key)}=?`, [...keys.map(k=>data[k]),key]);
}
export async function deleteRecord(db: Executor, spec: ResourceSpec, key: string | number) {
  return write(db, spec.softDelete ? `UPDATE ${ident(spec.table)} SET deleted_at=UTC_TIMESTAMP(3) WHERE ${ident(spec.key)}=? AND deleted_at IS NULL` : `DELETE FROM ${ident(spec.table)} WHERE ${ident(spec.key)}=?`, [key]);
}
const publicWhere = (spec: ResourceSpec) => spec.fields.status ? (spec.table==='news_articles'?"status='published' AND (published_at IS NULL OR published_at<=UTC_TIMESTAMP(3))":spec.fields.scheduled_at ? "status IN ('published','scheduled') AND (status='published' OR scheduled_at <= UTC_TIMESTAMP(3))" : "status='published'") : spec.fields.is_active ? 'is_active=1' : '1=1';
export async function publicList(db: Executor, spec: ResourceSpec, limit: number, offset: number, categoryId?: number) {
  if (!spec.publicFields) throw new Error('Resource has no public projection');
  const detailOnly = new Set(['description','body','challenge_text','solution_text','outcome_text']);
  const fields = ['products','services','projects','news_articles'].includes(spec.table) ? spec.publicFields.filter(field=>!detailOnly.has(field)) : spec.publicFields;
  const predicate = publicWhere(spec) + (spec.softDelete ? ' AND deleted_at IS NULL' : '') + (categoryId && spec.fields.category_id ? ' AND category_id=?' : '');
  const sort = spec.table==='achievements' ? 'sort_order ASC,id ASC' : spec.fields.sort_order ? 'sort_order ASC,id DESC' : spec.table === 'news_articles' ? 'published_at DESC,id DESC' : 'id DESC';
  const items = await rows<RowDataPacket>(db, `SELECT ${fields.map(ident).join(',')} FROM ${ident(spec.table)} WHERE ${predicate} ORDER BY ${sort} LIMIT ? OFFSET ?`, [...(categoryId && spec.fields.category_id ? [categoryId] : []),limit,offset]);
  const ids = [...new Set(items.map(item => Number(item.cover_media_id ?? item.photo_media_id ?? item.logo_media_id ?? item.media_id ?? 0)).filter(Boolean))];
  if (!ids.length) return items;
  const media = await rows<RowDataPacket>(db, `SELECT id,secure_url,alt_text,width_px,height_px FROM media_assets WHERE id IN (${ids.map(()=>'?').join(',')}) AND deleted_at IS NULL`, ids);
  const byId = new Map(media.map(item => [Number(item.id), item]));
  return items.map(item => ({ ...item, image: byId.get(Number(item.cover_media_id ?? item.photo_media_id ?? item.logo_media_id ?? item.media_id ?? 0)) ?? null }));
}
export function publicNewsCategories(db: Executor) {
  return rows<RowDataPacket>(db, `SELECT c.id,c.name,c.slug FROM news_categories c
    WHERE c.is_active=1 AND EXISTS (
      SELECT 1 FROM news_articles n WHERE n.category_id=c.id AND n.deleted_at IS NULL
      AND n.status='published' AND (n.published_at IS NULL OR n.published_at<=UTC_TIMESTAMP(3))
    ) ORDER BY c.sort_order,c.name,c.id`);
}
// The editor accepts a variant's final price, while the existing column stores
// its difference from the product base price. Keep that storage contract intact.
export function productVariantFinalPrice(base: unknown, adjustment: unknown): number | null {
  if (base === null || base === undefined || base === '' || adjustment === null || adjustment === undefined || adjustment === '') return null;
  const baseAmount = Number(base), difference = Number(adjustment);
  if (!Number.isFinite(baseAmount) || !Number.isFinite(difference)) return null;
  const final = Math.round((baseAmount + difference) * 100) / 100;
  return Number.isFinite(final) && final >= 0 ? final : null;
}
export async function publicDetail(db: Executor, spec: ResourceSpec, slug: string, socialMediaV2=false, variantMedia=false) {
  if (!spec.publicFields) throw new Error('Resource has no public projection');
  const data = (await rows<RowDataPacket>(db, `SELECT ${spec.publicFields.map(ident).join(',')} FROM ${ident(spec.table)} WHERE slug=? AND ${publicWhere(spec)} ${spec.softDelete ? 'AND deleted_at IS NULL' : ''} LIMIT 1`, [slug]))[0];
  if (!data) return null;
  const id = Number(data.id);
  const categoryTable = {products:'product_categories',services:'service_categories',news_articles:'news_categories'}[spec.table];
  if(categoryTable && data.category_id){
    data.category_name=(await rows<RowDataPacket>(db,`SELECT name FROM ${ident(categoryTable)} WHERE id=? LIMIT 1`,[data.category_id]))[0]?.name??null;
  }
  const coverId = Number(data.cover_media_id ?? 0);
  if (coverId) data.image = (await rows<RowDataPacket>(db,'SELECT secure_url,alt_text,width_px,height_px FROM media_assets WHERE id=? AND deleted_at IS NULL',[coverId]))[0] ?? null;
  const children: Record<string, RowDataPacket[]> = {};
  if (spec.table === 'products') {
    if(typeof data.description==='string')data.description=sanitizeProductDescription(data.description);
    children.images = await rows<RowDataPacket>(db, 'SELECT i.id,i.alt_text,i.is_cover,i.sort_order,m.secure_url,m.width_px,m.height_px FROM product_images i JOIN media_assets m ON m.id=i.media_id AND m.deleted_at IS NULL WHERE i.product_id=? ORDER BY i.sort_order,i.id LIMIT 100', [id]);
    children.features = await rows<RowDataPacket>(db, 'SELECT label,value_text,sort_order FROM product_features WHERE product_id=? ORDER BY sort_order,id LIMIT 100', [id]);
    children.variants = variantMedia
      ? await rows<RowDataPacket>(db, 'SELECT v.name,v.price_adjustment,v.stock_quantity,m.secure_url AS image_url,m.alt_text AS image_alt FROM product_variants v LEFT JOIN media_assets m ON m.id=v.media_id AND m.deleted_at IS NULL WHERE v.product_id=? AND v.is_active=1 ORDER BY v.sort_order,v.id LIMIT 100', [id])
      : await rows<RowDataPacket>(db, 'SELECT name,price_adjustment,stock_quantity FROM product_variants WHERE product_id=? AND is_active=1 ORDER BY sort_order,id LIMIT 100', [id]);
    children.variants = children.variants.map(variant => {
      const { price_adjustment, ...publicVariant } = variant;
      return { ...publicVariant, final_price: productVariantFinalPrice(data.base_price, price_adjustment) } as RowDataPacket;
    });
    children.purchaseLinks = socialMediaV2
      ? await rows<RowDataPacket>(db, 'SELECT l.id,l.store_name,l.button_label,l.url,l.social_link_id,l.is_primary,l.sort_order,a.url AS account_url,a.is_active AS account_active FROM product_purchase_links l LEFT JOIN social_links a ON a.id=l.social_link_id WHERE l.product_id=? AND l.is_active=1 ORDER BY l.is_primary DESC,l.sort_order,l.id LIMIT 100', [id])
      : await rows<RowDataPacket>(db, 'SELECT id,store_name,button_label,url,is_primary,sort_order FROM product_purchase_links WHERE product_id=? AND is_active=1 ORDER BY is_primary DESC,sort_order,id LIMIT 100', [id]);
    const hasLegacyWhatsApp=children.purchaseLinks.some(link=>String(link.store_name).toLowerCase().replace(/[^a-z]/g,'')==='whatsapp'&&!link.social_link_id);
    const whatsapp=hasLegacyWhatsApp?await globalWhatsApp(db):null;
    children.purchaseLinks=children.purchaseLinks.flatMap(link=>{
      const {social_link_id,account_url,account_active,...publicLink}=link;
      if(String(link.store_name).toLowerCase().replace(/[^a-z]/g,'')!=='whatsapp')return [publicLink as RowDataPacket];
      if(social_link_id)return account_active&&account_url?[{...publicLink,url:account_url} as RowDataPacket]:[];
      return whatsapp?[{...publicLink,url:whatsapp} as RowDataPacket]:[];
    }).filter(link=>validPurchaseUrl(String(link.url??'')));
  }
  if (spec.table === 'services') {
    children.images = await rows<RowDataPacket>(db, 'SELECT i.id,i.alt_text,i.is_cover,i.sort_order,m.secure_url FROM service_images i JOIN media_assets m ON m.id=i.media_id AND m.deleted_at IS NULL WHERE i.service_id=? ORDER BY i.sort_order,i.id LIMIT 100', [id]);
    children.items = await rows<RowDataPacket>(db, 'SELECT item_type,label,sort_order FROM service_list_items WHERE service_id=? ORDER BY item_type,sort_order,id LIMIT 100', [id]);
    children.processSteps = await rows<RowDataPacket>(db, 'SELECT title,description,sort_order FROM service_process_steps WHERE service_id=? ORDER BY sort_order,id LIMIT 100', [id]);
  }
  if (spec.table === 'projects') {
    children.images = await rows<RowDataPacket>(db, 'SELECT i.alt_text,i.sort_order,m.secure_url FROM project_images i JOIN media_assets m ON m.id=i.media_id AND m.deleted_at IS NULL WHERE i.project_id=? ORDER BY i.sort_order,i.id LIMIT 100', [id]);
    children.services = await rows<RowDataPacket>(db, "SELECT s.name,s.slug FROM project_services ps JOIN services s ON s.id=ps.service_id WHERE ps.project_id=? AND s.status='published' AND s.deleted_at IS NULL ORDER BY s.sort_order,s.id LIMIT 100", [id]);
    children.teamMembers = await rows<RowDataPacket>(db, "SELECT t.full_name,t.slug,pt.contribution_label FROM project_team_members pt JOIN team_members t ON t.id=pt.team_member_id WHERE pt.project_id=? AND t.status='published' AND t.deleted_at IS NULL ORDER BY t.sort_order,t.id LIMIT 100", [id]);
  }
  if (spec.table === 'news_articles') {
    children.images = await rows<RowDataPacket>(db, 'SELECT COALESCE(i.alt_text,m.alt_text) AS alt_text,COALESCE(m.caption,i.caption) AS caption,i.sort_order,m.secure_url,m.width_px,m.height_px FROM news_images i JOIN media_assets m ON m.id=i.media_id AND m.deleted_at IS NULL WHERE i.article_id=? ORDER BY i.sort_order,i.id LIMIT 100', [id]);
    const author = await rows<RowDataPacket>(db, `SELECT COALESCE(t.full_name,u.display_name) AS author_name FROM news_articles n
      LEFT JOIN users u ON u.id=n.author_user_id AND u.deleted_at IS NULL
      LEFT JOIN team_members t ON t.id=n.author_team_member_id AND t.deleted_at IS NULL
      WHERE n.id=? LIMIT 1`, [id]);
    data.author_name = author[0]?.author_name ?? null;
  }
  if (['team_members','partners','achievements'].includes(spec.table)) {
    const mediaId = Number(data.photo_media_id ?? data.logo_media_id ?? data.media_id ?? 0);
    if (mediaId) data.image = (await rows<RowDataPacket>(db, 'SELECT secure_url,alt_text,width_px,height_px FROM media_assets WHERE id=? AND deleted_at IS NULL', [mediaId]))[0] ?? null;
  }
  return { ...data, ...children };
}
export async function replaceProjectRelations(db: Executor, projectId: number, table: 'project_services' | 'project_team_members', key: 'service_id' | 'team_member_id', ids: number[]) {
  await write(db, `DELETE FROM ${ident(table)} WHERE project_id=?`, [projectId]);
  for (const id of ids) await write(db, `INSERT INTO ${ident(table)} (project_id,${ident(key)}) VALUES (?,?)`, [projectId,id]);
}
export function projectRelationList(db: Executor, projectId:number, kind:'services'|'team-members') {
  return kind==='services'
    ? rows<RowDataPacket>(db,'SELECT ps.service_id AS id,s.name AS label,s.slug FROM project_services ps JOIN services s ON s.id=ps.service_id WHERE ps.project_id=? ORDER BY s.name',[projectId])
    : rows<RowDataPacket>(db,'SELECT pt.team_member_id AS id,t.full_name AS label,t.slug FROM project_team_members pt JOIN team_members t ON t.id=pt.team_member_id WHERE pt.project_id=? ORDER BY t.full_name',[projectId]);
}
export async function activePurchaseLinkCount(db: Executor, productId: number) {
  return Number((await rows<RowDataPacket>(db, 'SELECT COUNT(*) AS count FROM product_purchase_links WHERE product_id=? AND is_active=1', [productId]))[0]?.count ?? 0);
}
export function validPurchaseUrl(value:string){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}}
export async function globalWhatsApp(db:Executor){
  const links=await rows<RowDataPacket>(db,'SELECT platform_code,url FROM social_links WHERE is_active=1 ORDER BY sort_order,id LIMIT 24');
  const value=links.find(link=>String(link.platform_code).toLowerCase().replace(/[^a-z]/g,'')==='whatsapp')?.url;
  return typeof value==='string'&&validPurchaseUrl(value)?value:null;
}
export async function featuredServiceOwner(db: Executor, slot: number) {
  return (await rows<RowDataPacket>(db, 'SELECT id FROM services WHERE featured_slot=? AND deleted_at IS NULL FOR UPDATE', [slot]))[0];
}
export async function mediaById(db: Executor, id: number) {
  return (await rows<RowDataPacket>(db, 'SELECT id FROM media_assets WHERE id=? AND deleted_at IS NULL', [id]))[0];
}
export async function categoryReferenceCount(db: Executor, table: 'products'|'services'|'news_articles', categoryId: number) {
  return Number((await rows<RowDataPacket>(db,`SELECT COUNT(*) AS count FROM ${ident(table)} WHERE category_id=? AND deleted_at IS NULL`,[categoryId]))[0]?.count??0);
}
export async function publicSite(db: Executor, useSecondarySlots=false,useFooterV2=false) {
  const site = (await rows<RowDataPacket>(db, 'SELECT site_name,tagline,public_email,public_phone,whatsapp_number,address_text,footer_description,default_meta_title,default_meta_description,default_og_media_id FROM site_settings WHERE id=1'))[0] ?? null;
  const socialLinks = await rows<RowDataPacket>(db, 'SELECT platform_code,label,url,icon_key,sort_order FROM social_links WHERE is_active=1 ORDER BY sort_order,id LIMIT 24');
  const pages = await rows<RowDataPacket>(db, 'SELECT page_key,eyebrow,heading,description,primary_cta_label,primary_cta_url,meta_title,meta_description,og_media_id FROM page_settings ORDER BY page_key');
  if(useSecondarySlots){
    const {secondarySlotsReady}=await import('../services/secondaryPages');
    if(await secondarySlotsReady(db)){
      const slots=await rows<RowDataPacket>(db,`SELECT p.page_key,s.slot_key,s.value_type,s.text_value,s.media_id,m.secure_url,m.alt_text
        FROM secondary_page_content_slots AS s JOIN page_settings AS p ON p.id=s.page_settings_id
        LEFT JOIN media_assets AS m ON m.id=s.media_id AND m.deleted_at IS NULL
        WHERE p.page_key IN ('products','services','news','media_kit') ORDER BY p.page_key,s.slot_key`);
      for(const page of pages){
        page.slots=Object.fromEntries(slots.filter(slot=>slot.page_key===page.page_key&&['text','mode'].includes(String(slot.value_type))).map(slot=>[slot.slot_key,slot.text_value]));
        if(page.page_key==='products'){
          const banner=slots.find(slot=>slot.page_key==='products'&&slot.slot_key==='banner_media_id'&&slot.value_type==='media');
          page.banner_media=banner?.secure_url?{id:Number(banner.media_id),secure_url:String(banner.secure_url),alt_text:String(banner.alt_text??'')}:null;
        }
      }
    }
  }
  const footer=useFooterV2?await (await import('../services/footerV2')).publicFooterV2(db,true):null;
  if(site&&footer?.mapUrl)site.google_maps_embed_url=footer.mapUrl;
  return { site, socialLinks, pages,footerSocialPlacements:footer?.accounts??null };
}
export async function publicHomepageSettings(db: Executor, threeLineHero=false,contactEnabled=false,aboutEditorialEnabled=false) {
  const sections = await rows<RowDataPacket>(db, 'SELECT section_key,eyebrow,heading,description,primary_cta_label,primary_cta_url,is_visible FROM homepage_section_settings ORDER BY section_key');
  const hero = (await rows<RowDataPacket>(db, `SELECT eyebrow,heading_line_1,heading_line_2,${threeLineHero?'heading_line_3,':''}description_line_1,description_line_2,intro_enabled,default_workspace FROM hero_settings WHERE id=1`))[0] ?? null;
  const heroTrustSignals = await rows<RowDataPacket>(db, 'SELECT slot,numeric_value,suffix,label,is_visible FROM hero_trust_signals ORDER BY slot');
  const heroWorkspaces = await rows<RowDataPacket>(db, 'SELECT workspace_key,display_name,primary_cta_label,primary_cta_url,secondary_cta_label,secondary_cta_url,is_enabled FROM hero_workspace_content ORDER BY workspace_key');
  const heroHotspots = await rows<RowDataPacket>(db, 'SELECT hotspot_key,workspace_key,label,numeric_value,numeric_suffix,sort_order,is_enabled FROM hero_hotspot_content ORDER BY workspace_key,sort_order');
  const about = (await rows<RowDataPacket>(db, 'SELECT eyebrow,heading,lead_text,body_text,workspaces_heading,principles_heading FROM about_settings WHERE id=1'))[0] ?? null;
  const aboutWorkspaces = await rows<RowDataPacket>(db, 'SELECT workspace_key,name,short_label,description,cta_label,cta_url,sort_order,is_visible FROM about_workspaces ORDER BY sort_order');
  const aboutPrinciples = await rows<RowDataPacket>(db, 'SELECT slot,title,description,icon_key,is_visible FROM about_principles ORDER BY slot');
  const team = (await rows<RowDataPacket>(db, 'SELECT eyebrow,heading,description,normal_mode_instruction,ring_mode_instruction,default_display_mode FROM team_section_settings WHERE id=1'))[0] ?? null;
  const achievements = (await rows<RowDataPacket>(db, 'SELECT eyebrow,heading,description FROM achievement_section_settings WHERE id=1'))[0] ?? null;
  const contact = (await rows<RowDataPacket>(db, 'SELECT eyebrow,heading,description,email_label,phone_label,whatsapp_cta_label FROM contact_section_settings WHERE id=1'))[0] ?? null;
  const chatMessages = await rows<RowDataPacket>(db, 'SELECT message_text,speaker,sort_order FROM contact_chat_messages WHERE is_active=1 ORDER BY sort_order,id LIMIT 16');
  const contactPlacement=contactEnabled?await (await import('../services/contactPlacements')).publicContactPlacements(db,true):null;
  const editorial=aboutEditorialEnabled?await (await import('../services/aboutEditorialV2')).getAboutEditorial(db,true):null;
  return { sections, hero, heroTrustSignals, heroWorkspaces, heroHotspots, about, aboutWorkspaces, aboutPrinciples, aboutEditorial:editorial?.enabled&&editorial.initialized?editorial.edit:aboutPreviewDefaults, team, achievements, contact,contactPlacement, chatMessages };
}
