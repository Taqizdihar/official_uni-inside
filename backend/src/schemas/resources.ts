import { z } from 'zod';
import { safeServiceCtaHref } from '../utils/serviceLinks';
import {characterCount,safeExternalUrl,safeMemberProfile,type MemberSocialColumn} from '../contracts/aboutTeam';

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().max(max).nullable();
const url = z.url().max(1000).refine(value => /^https?:\/\//.test(value), 'Use an HTTPS or HTTP URL');
const optionalUrl = url.nullable();
const optionalLink = z.string().max(1000).refine(value => /^https?:\/\//.test(value) || /^\/(?!\/)/.test(value), 'Use a site path or HTTPS/HTTP URL').nullable();
const optionalServiceLink = z.string().max(1000).refine(safeServiceCtaHref, 'Use a safe site path, HTTP(S), mailto, or tel URL').nullable();
const link = optionalLink.unwrap();
const int = z.number().int().nonnegative().max(2_147_483_647);
const id = z.number().int().positive();
const optionalId = id.nullable();
const bool = z.boolean();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(190);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const datetime = z.iso.datetime({ offset: true }).nullable();
const status = z.enum(['draft','published','archived']);
const scheduledStatus = z.enum(['draft','scheduled','published','archived']);
const price = z.number().min(0).max(999_999_999_999).nullable();

export type ResourceSpec = {
  table: string;
  key: string;
  permission: string;
  kind: 'dynamic' | 'fixed';
  fields: z.ZodRawShape;
  required?: string[];
  defaults?: Record<string, unknown>;
  titleField?: string;
  softDelete?: boolean;
  publicFields?: string[];
  childOf?: { table: string; foreignKey: string };
  maxRows?: number;
};
const dynamic = (table: string, permission: string, fields: z.ZodRawShape, options: Partial<ResourceSpec> = {}): ResourceSpec => ({ table, permission, key: 'id', kind: 'dynamic', fields, ...options });
const fixed = (table: string, key: string, permission: string, fields: z.ZodRawShape): ResourceSpec => ({ table, key, permission, kind: 'fixed', fields });
const ordering = { sort_order: z.number().int().min(0).max(65535) };
const seo = { meta_title: optionalText(255), meta_description: optionalText(500) };
const media = { cover_media_id: optionalId };
const short = { short_description: z.string().max(500) };
const commonStatus = { status };
const longBody = optionalText(100_000);
const unicodeText=(max:number)=>z.string().trim().min(1).refine(value=>characterCount(value)<=max,`Maksimal ${max} karakter.`);
const memberProfile=(column:MemberSocialColumn)=>z.string().max(1000).refine(value=>safeMemberProfile(value,column),'Gunakan URL profil HTTPS resmi.').nullable();
const partnerUrl=z.string().max(1000).refine(value=>safeExternalUrl(value,false),'Gunakan URL HTTP(S) yang aman.').nullable();

// Each path has a fixed table, editable-field schema and permission family. No
// caller-supplied table or column identifier is ever accepted by the API.
export const resources: Record<string, ResourceSpec> = {
  'social-links': dynamic('social_links','settings', { platform_code: text(64), label: text(100), url, icon_key: optionalText(100), is_active: bool, ...ordering }, { required: ['platform_code','label','url'], maxRows: 24 }),
  partners: dynamic('partners','partners', { name: unicodeText(150), slug, logo_media_id: optionalId, website_url: partnerUrl, description: optionalText(1000), ...commonStatus, ...ordering }, { required: ['name'], titleField:'name', softDelete:true, publicFields:['id','name','slug','logo_media_id','website_url','description','sort_order'] }),
  'team-members': dynamic('team_members','team', { full_name: unicodeText(150), slug, role_title: z.string().refine(value=>characterCount(value)<=190), short_bio: z.string().refine(value=>characterCount(value)<=1000).nullable(), photo_media_id: optionalId, linkedin_url: memberProfile('linkedin_url'), instagram_url: memberProfile('instagram_url'), x_url: memberProfile('x_url'), github_url: memberProfile('github_url'), ...commonStatus, ...ordering, joined_at: date, departed_at: date }, { required:['full_name'], defaults:{role_title:''}, titleField:'full_name', softDelete:true, publicFields:['id','full_name','slug','role_title','short_bio','photo_media_id','linkedin_url','instagram_url','x_url','github_url','sort_order'] }),
  'product-categories': dynamic('product_categories','products', { name: text(150), slug, description: optionalText(1000), ...ordering, is_active: bool }, {required:['name'],titleField:'name',publicFields:['id','name','slug','description','sort_order']}),
  products: dynamic('products','products', { category_id:optionalId,name:text(190),slug,product_type:z.enum(['ready_made','custom','both']),...short,description:longBody,base_price:price,currency_code:z.string().regex(/^[A-Z]{3}$/),price_note:optionalText(255),availability_label:optionalText(100),lead_time_text:optionalText(255),minimum_order_quantity:int.nullable(),...media,status:scheduledStatus,is_featured:bool,...ordering,...seo,scheduled_at:datetime }, {required:['name'],defaults:{short_description:''},titleField:'name',softDelete:true,publicFields:['id','category_id','name','slug','product_type','short_description','description','base_price','currency_code','price_note','availability_label','lead_time_text','minimum_order_quantity','cover_media_id','is_featured','sort_order','meta_title','meta_description','published_at']}),
  'product-images': dynamic('product_images','products',{product_id:id,media_id:id,alt_text:optionalText(255),is_cover:bool,...ordering},{required:['product_id','media_id'],childOf:{table:'products',foreignKey:'product_id'}}),
  'product-features': dynamic('product_features','products',{product_id:id,label:text(150),value_text:text(500),...ordering},{required:['product_id','label','value_text'],childOf:{table:'products',foreignKey:'product_id'}}),
  'product-color-options': dynamic('product_color_options','products',{product_id:id,name:text(100),hex_color:z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),media_id:optionalId,...ordering,is_active:bool},{required:['product_id','name'],childOf:{table:'products',foreignKey:'product_id'}}),
  'product-variants': dynamic('product_variants','products',{product_id:id,name:text(150),sku:optionalText(100),price_adjustment:z.number().min(-999_999_999).max(999_999_999),stock_quantity:int.nullable(),is_active:bool,...ordering},{required:['product_id','name'],childOf:{table:'products',foreignKey:'product_id'}}),
  'product-purchase-links': dynamic('product_purchase_links','products',{product_id:id,store_name:text(100),button_label:text(100),url,is_primary:bool,is_active:bool,...ordering},{required:['product_id','store_name','button_label','url'],childOf:{table:'products',foreignKey:'product_id'}}),
  'service-categories': dynamic('service_categories','services',{name:text(150),slug,description:optionalText(1000),...ordering,is_active:bool},{required:['name'],titleField:'name',publicFields:['id','name','slug','description','sort_order']}),
  services: dynamic('services','services',{category_id:optionalId,name:text(190),slug,...short,description:longBody,pricing_type:z.enum(['fixed','starting_from','range','contact']),starting_price:price,currency_code:z.string().regex(/^[A-Z]{3}$/),price_note:optionalText(255),estimated_duration:optionalText(255),...media,status:scheduledStatus,featured_slot:z.number().int().min(1).max(3).nullable(),...ordering,primary_cta_label:optionalText(100),primary_cta_url:optionalServiceLink,...seo,scheduled_at:datetime},{required:['name'],defaults:{short_description:''},titleField:'name',softDelete:true,publicFields:['id','category_id','name','slug','short_description','description','pricing_type','starting_price','currency_code','price_note','estimated_duration','cover_media_id','featured_slot','sort_order','primary_cta_label','primary_cta_url','meta_title','meta_description','published_at']}),
  'service-list-items': dynamic('service_list_items','services',{service_id:id,item_type:z.enum(['deliverable','included','requirement','not_included']),label:text(500),...ordering},{required:['service_id','item_type','label'],childOf:{table:'services',foreignKey:'service_id'}}),
  'service-process-steps': dynamic('service_process_steps','services',{service_id:id,title:text(150),description:optionalText(1000),...ordering},{required:['service_id','title'],childOf:{table:'services',foreignKey:'service_id'}}),
  'service-images': dynamic('service_images','services',{service_id:id,media_id:id,alt_text:optionalText(255),is_cover:bool,...ordering},{required:['service_id','media_id'],childOf:{table:'services',foreignKey:'service_id'}}),
  projects: dynamic('projects','projects',{title:text(190),slug,client_name:optionalText(190),project_date:date,...short,challenge_text:optionalText(20_000),solution_text:optionalText(20_000),outcome_text:optionalText(20_000),...media,external_url:optionalUrl,...commonStatus,is_featured:bool,...ordering},{required:['title'],defaults:{short_description:''},titleField:'title',softDelete:true,publicFields:['id','title','slug','client_name','project_date','short_description','challenge_text','solution_text','outcome_text','cover_media_id','external_url','is_featured','sort_order','published_at']}),
  'project-images': dynamic('project_images','projects',{project_id:id,media_id:id,alt_text:optionalText(255),...ordering},{required:['project_id','media_id'],childOf:{table:'projects',foreignKey:'project_id'}}),
  'news-categories': dynamic('news_categories','news',{name:text(150),slug,description:optionalText(1000),...ordering,is_active:bool},{required:['name'],titleField:'name',publicFields:['id','name','slug','description','sort_order']}),
  news: dynamic('news_articles','news',{category_id:optionalId,author_user_id:optionalId,author_team_member_id:optionalId,title:text(255),slug,content_type:z.enum(['news','article','update','event']),excerpt:z.string().max(1000),body:longBody,reading_time_minutes:z.number().int().min(1).max(999).nullable(),...media,status:scheduledStatus,is_featured:bool,...seo,scheduled_at:datetime},{required:['title'],defaults:{excerpt:''},titleField:'title',softDelete:true,publicFields:['id','category_id','author_team_member_id','title','slug','content_type','excerpt','body','cover_media_id','is_featured','reading_time_minutes','meta_title','meta_description','published_at']}),
  'news-images': dynamic('news_images','news',{article_id:id,media_id:id,alt_text:optionalText(255),caption:optionalText(500),...ordering},{required:['article_id','media_id'],childOf:{table:'news_articles',foreignKey:'article_id'}}),
  achievements: dynamic('achievements','achievements',{title:text(190),description:optionalText(1000),year_label:optionalText(20),achievement_date:date,issuer_name:optionalText(190),external_url:optionalUrl,icon_key:optionalText(100),media_id:optionalId,...commonStatus,...ordering},{required:['title'],titleField:'title',softDelete:true,publicFields:['id','title','description','year_label','achievement_date','issuer_name','external_url','icon_key','media_id','sort_order']}),
  'contact-chat-messages': dynamic('contact_chat_messages','settings',{message_text:text(500),speaker:z.enum(['studio','visitor']),is_active:bool,...ordering},{required:['message_text'],maxRows:16}),

  'site-settings': fixed('site_settings','id','settings',{site_name:text(150),tagline:optionalText(255),public_email:z.email().max(254).nullable(),public_phone:optionalText(50),whatsapp_number:optionalText(50),address_text:optionalText(500),footer_description:optionalText(1000),default_meta_title:optionalText(255),default_meta_description:optionalText(500),default_og_media_id:optionalId}),
  'page-settings': fixed('page_settings','page_key','settings',{eyebrow:optionalText(150),heading:text(255),description:optionalText(1000),primary_cta_label:optionalText(100),primary_cta_url:optionalLink,default_sort_key:optionalText(64),meta_title:optionalText(255),meta_description:optionalText(500),og_media_id:optionalId}),
  'homepage-sections': fixed('homepage_section_settings','section_key','homepage',{eyebrow:optionalText(150),heading:text(255),description:optionalText(1000),primary_cta_label:optionalText(100),primary_cta_url:optionalLink,is_visible:bool}),
  'hero-settings': fixed('hero_settings','id','homepage',{eyebrow:optionalText(150),heading_line_1:text(255),heading_line_2:text(255),description_line_1:text(500),description_line_2:optionalText(500),intro_enabled:bool,default_workspace:z.enum(['studio','craft'])}),
  'hero-trust-signals': fixed('hero_trust_signals','slot','homepage',{numeric_value:int,suffix:optionalText(20),label:text(100),is_visible:bool}),
  'hero-workspaces': fixed('hero_workspace_content','workspace_key','homepage',{display_name:text(100),primary_cta_label:text(100),primary_cta_url:link,secondary_cta_label:optionalText(100),secondary_cta_url:optionalLink,is_enabled:bool}),
  'hero-hotspots': fixed('hero_hotspot_content','hotspot_key','homepage',{label:text(150),numeric_value:int.nullable(),numeric_suffix:optionalText(16),...ordering,is_enabled:bool}),
  'about-settings': fixed('about_settings','id','homepage',{eyebrow:optionalText(150),heading:text(255),lead_text:text(1000),body_text:optionalText(3000),workspaces_heading:optionalText(255),principles_heading:optionalText(255)}),
  'about-workspaces': fixed('about_workspaces','workspace_key','homepage',{name:text(100),short_label:optionalText(100),description:text(1000),cta_label:optionalText(100),cta_url:optionalLink,...ordering,is_visible:bool}),
  'about-principles': fixed('about_principles','slot','homepage',{title:text(150),description:text(1000),icon_key:optionalText(100),is_visible:bool}),
  'team-section-settings': fixed('team_section_settings','id','homepage',{eyebrow:optionalText(150),heading:text(255),description:optionalText(1000),normal_mode_instruction:optionalText(500),ring_mode_instruction:optionalText(500),default_display_mode:z.enum(['normal','ring'])}),
  'achievement-section-settings': fixed('achievement_section_settings','id','homepage',{eyebrow:optionalText(150),heading:text(255),description:optionalText(1000)}),
  'contact-section-settings': fixed('contact_section_settings','id','homepage',{eyebrow:optionalText(150),heading:text(255),description:optionalText(1000),email_label:optionalText(100),phone_label:optionalText(100),whatsapp_cta_label:optionalText(100)}),
};

export function inputSchema(spec: ResourceSpec) { return z.strictObject(spec.fields).partial(); }
export function slugify(value: string) { return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,190); }
export function fixedKeyAllowed(name: string, key: string) {
  if (['site-settings','hero-settings','about-settings','team-section-settings','achievement-section-settings','contact-section-settings'].includes(name)) return key === '1';
  if (name === 'hero-trust-signals' || name === 'about-principles') return ['1','2','3'].includes(key);
  if (name === 'hero-workspaces' || name === 'about-workspaces') return ['studio','craft'].includes(key);
  if (name === 'page-settings') return ['products','services','news','media_kit'].includes(key);
  if (name === 'homepage-sections') return ['partners','products','services','news'].includes(key);
  return name === 'hero-hotspots' && /^[a-z0-9_]+$/.test(key);
}
