import { z } from 'zod';
import type { Pool } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import { rows,transaction } from '../database/pool';
import * as repo from '../repositories/content';
import { audit,revision } from '../repositories/audit';
import { resources,slugify } from '../schemas/resources';
import { publishProblems } from './content';
import { HttpError,parse } from '../utils/http';
import { productSummary,sanitizeProductDescription } from '../utils/productDescription';

const id=z.number().int().positive();
const optionalText=(max:number)=>z.string().trim().max(max).nullable().optional();
const amount=z.number().finite().min(0).max(999_999_999_999);
export const platformNames={shopee:'Shopee',tokopedia:'Tokopedia',tiktok:'TikTok Shop',shopify:'Shopify',whatsapp:'WhatsApp'} as const;
export const productFormSchema=z.strictObject({
  action:z.enum(['draft','publish']),name:z.string().trim().min(1).max(190),
  category_id:id.nullable().optional(),product_type:z.enum(['ready_made','custom','both']).optional(),
  description:z.string().max(70_000).default(''),cover_media_id:id.nullable().optional(),gallery_media_ids:z.array(id).max(8).default([]),
  base_price:amount.nullable().optional(),currency_code:z.string().regex(/^[A-Z]{3}$/).default('IDR'),
  availability_label:optionalText(100),price_note:optionalText(255),lead_time_text:optionalText(255),
  minimum_order_quantity:z.number().int().min(1).max(2_147_483_647).nullable().optional(),
  features:z.array(z.strictObject({label:z.string().trim().min(1).max(150),value_text:z.string().trim().min(1).max(500)})).max(100).default([]),
  variants:z.array(z.strictObject({name:z.string().trim().min(1).max(150),price:amount,stock_quantity:z.number().int().min(0).max(2_147_483_647).nullable(),is_active:z.boolean(),media_id:id.nullable().optional()})).max(100).default([]),
  platforms:z.array(z.strictObject({platform:z.enum(['shopee','tokopedia','tiktok','shopify','whatsapp']),url:z.string().trim().max(1000).optional()})).max(5).default([]),
});
export const validPurchaseUrl=repo.validPurchaseUrl;
export function productFormInput(raw:unknown){
  // Wholly empty feature rows are editing affordances, never stored records.
  const prepared=raw&&typeof raw==='object'&&!Array.isArray(raw)?{...raw as Record<string,unknown>}:raw;
  if(prepared&&typeof prepared==='object'&&'features' in prepared&&Array.isArray(prepared.features))prepared.features=prepared.features.filter((row:unknown)=>!(row&&typeof row==='object'&&'label' in row&&'value_text' in row&&typeof row.label==='string'&&typeof row.value_text==='string'&&!row.label.trim()&&!row.value_text.trim()));
  const input=parse(productFormSchema,prepared);
  if(input.variants.some(variant=>variant.media_id))throw new HttpError(400,'VARIANT_IMAGE_UNSUPPORTED','Foto varian belum dapat disimpan. Hapus pilihan foto varian sebelum menyimpan.');
  if(input.variants.length&&input.base_price==null)throw new HttpError(400,'PRODUCT_FORM_INCOMPLETE','Isi harga dasar agar harga varian dapat disimpan dengan benar.');
  const imageIds=[input.cover_media_id,...input.gallery_media_ids].filter((value):value is number=>Boolean(value));
  if(new Set(imageIds).size!==imageIds.length)throw new HttpError(400,'VALIDATION_ERROR','Setiap foto hanya boleh dipilih satu kali.');
  if(new Set(input.platforms.map(item=>item.platform)).size!==input.platforms.length)throw new HttpError(400,'VALIDATION_ERROR','Platform pembelian tidak boleh duplikat.');
  for(const link of input.platforms){
    if(link.platform==='whatsapp'&&link.url)throw new HttpError(400,'VALIDATION_ERROR','WhatsApp menggunakan tautan global.');
    if(link.platform!=='whatsapp'&&(!link.url||!validPurchaseUrl(link.url)))throw new HttpError(400,'VALIDATION_ERROR','Gunakan URL produk http atau https yang valid.');
  }
  const description=sanitizeProductDescription(input.description,true);
  return {...input,description,short_description:productSummary(description)};
}
export async function createProductForm(db:Pool,raw:unknown,actor:{id:number;permissions:Set<string>},requestId:string){
  if(!actor.permissions.has('products.create'))throw new HttpError(403,'FORBIDDEN','Anda tidak memiliki izin membuat produk.');
  const input=productFormInput(raw);
  if(input.action==='publish'&&(!actor.permissions.has('products.publish')||!actor.permissions.has('products.update')))throw new HttpError(403,'FORBIDDEN','Anda tidak memiliki izin menerbitkan produk.');
  if(input.action==='publish'&&!input.product_type)throw new HttpError(400,'PUBLISH_INCOMPLETE','Pilih jenis produk sebelum diterbitkan.');
  const slug=slugify(input.name);if(!slug)throw new HttpError(400,'VALIDATION_ERROR','Nama produk harus menghasilkan slug URL yang valid.');
  return transaction(db,async conn=>{
    const imageIds=[input.cover_media_id,...input.gallery_media_ids].filter((value):value is number=>Boolean(value));
    if(imageIds.length){const media=await rows<RowDataPacket>(conn,`SELECT id FROM media_assets WHERE deleted_at IS NULL AND id IN (${imageIds.map(()=>'?').join(',')})`,imageIds);if(media.length!==imageIds.length)throw new HttpError(400,'INVALID_MEDIA','Gambar tidak tersedia.');}
    if(input.category_id&&!await repo.record(conn,resources['product-categories']!,input.category_id))throw new HttpError(400,'INVALID_REFERENCE','Kategori tidak tersedia.');
    const whatsapp=input.platforms.some(link=>link.platform==='whatsapp')?await repo.globalWhatsApp(conn):null;
    if(input.platforms.some(link=>link.platform==='whatsapp')&&!whatsapp)throw new HttpError(400,'WHATSAPP_NOT_CONFIGURED','Tautan WhatsApp global belum tersedia.');
    const product={name:input.name,slug,category_id:input.category_id??null,product_type:input.product_type??'ready_made',description:input.description,short_description:input.short_description,cover_media_id:input.cover_media_id??null,base_price:input.base_price??null,currency_code:input.currency_code,availability_label:input.availability_label??null,price_note:input.price_note??null,lead_time_text:input.lead_time_text??null,minimum_order_quantity:input.minimum_order_quantity??null,status:'draft',created_by:actor.id,updated_by:actor.id};
    if(input.action==='publish'){
      const missing=publishProblems('products',product,{purchaseLinks:input.platforms.length});
      if(missing.length)throw new HttpError(400,'PUBLISH_INCOMPLETE','Lengkapi produk sebelum diterbitkan.',missing);
    }
    const productId=await repo.insertRecord(conn,resources.products!,product);
    for(const [index,mediaId] of imageIds.entries())await repo.insertRecord(conn,resources['product-images']!,{product_id:productId,media_id:mediaId,is_cover:mediaId===input.cover_media_id?1:0,sort_order:index});
    for(const [index,feature] of input.features.entries())await repo.insertRecord(conn,resources['product-features']!,{product_id:productId,...feature,sort_order:index});
    for(const [index,variant] of input.variants.entries()){
      const adjustment=Math.round((variant.price-Number(input.base_price))*100)/100;
      if(Math.abs(adjustment)>999_999_999)throw new HttpError(400,'VALIDATION_ERROR','Selisih harga varian melampaui batas yang didukung.');
      await repo.insertRecord(conn,resources['product-variants']!,{product_id:productId,name:variant.name,price_adjustment:adjustment,stock_quantity:variant.stock_quantity,is_active:variant.is_active?1:0,sort_order:index});
    }
    for(const [index,link] of input.platforms.entries())await repo.insertRecord(conn,resources['product-purchase-links']!,{product_id:productId,store_name:platformNames[link.platform],button_label:platformNames[link.platform],url:link.platform==='whatsapp'?whatsapp:link.url,is_primary:index===0?1:0,is_active:1,sort_order:index});
    if(input.action==='publish')await repo.updateRecord(conn,resources.products!,productId,{status:'published',published_at:new Date().toISOString().slice(0,23).replace('T',' ')});
    const saved=await repo.record(conn,resources.products!,productId);
    const snapshot={...saved,images:imageIds,features:input.features,variants:input.variants.map(variant=>({name:variant.name,price:variant.price,stock_quantity:variant.stock_quantity,is_active:variant.is_active})),platforms:input.platforms};
    await revision(conn,{entityType:'products',entityId:productId,snapshot,actorId:actor.id,summary:input.action==='publish'?'Created and published':'Created draft'});
    await audit(conn,{actorId:actor.id,action:input.action==='publish'?'products.publish':'products.create',entityType:'products',entityId:productId,requestId,after:snapshot});
    return saved;
  });
}
