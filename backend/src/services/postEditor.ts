import type {Pool,RowDataPacket} from 'mysql2/promise';
import {rows,write,transaction,type Executor} from '../database/pool';
import {record,globalWhatsApp} from '../repositories/content';
import {revision,audit} from '../repositories/audit';
import {resources} from '../schemas/resources';
import {HttpError} from '../utils/http';
import {validateMediaIds} from './mediaReferences';
import {productFormInput,platformNames,validPurchaseUrl} from './productCreate';
import {validateServiceCreate} from './serviceCreation';
import {validateNewsCreate} from './newsCreation';
import {account} from '../repositories/socialMedia';
import type {CmsCapabilities} from './capabilities';

type Kind='products'|'services'|'news';
type Actor={id:number;permissions:Set<string>};
const table={products:'products',services:'services',news:'news_articles'} as const;
const parseId=(value:unknown)=>{if(value==null)return null;if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)throw new HttpError(400,'VALIDATION_ERROR','ID item tidak valid.');return value;};
const requiredArray=(value:unknown,label:string)=>{if(!Array.isArray(value))throw new HttpError(400,'VALIDATION_ERROR',`${label} belum dimuat. Muat ulang halaman sebelum menyimpan.`);return value as Record<string,unknown>[];};
const ids=(items:Record<string,unknown>[])=>{const all=items.map(item=>parseId(item.id)),chosen=all.filter(Boolean);if(new Set(chosen).size!==chosen.length)throw new HttpError(400,'VALIDATION_ERROR','ID item berulang.');return all;};
const clean=(items:Record<string,unknown>[])=>items.map(({id:unused,...item})=>{void unused;return item;});
const photo=(row:RowDataPacket|undefined)=>row?{id:Number(row.id),secure_url:String(row.secure_url),alt_text:row.alt_text??null}:null;
export async function getPostEditor(db:Executor,kind:Kind,key:number,caps?:CmsCapabilities){
 const parent=await record(db,resources[kind]!,key);
 if(!parent)throw new HttpError(404,'NOT_FOUND','Konten tidak ditemukan.');
 const queries=kind==='products'?[`SELECT * FROM product_images WHERE product_id=? ORDER BY sort_order,id`,`SELECT * FROM product_features WHERE product_id=? ORDER BY sort_order,id`,caps?.productVariantMedia.enabled?`SELECT * FROM product_variants WHERE product_id=? ORDER BY sort_order,id`:`SELECT id,name,price_adjustment,stock_quantity,is_active,sort_order FROM product_variants WHERE product_id=? ORDER BY sort_order,id`,caps?.socialMediaV2.enabled?`SELECT * FROM product_purchase_links WHERE product_id=? ORDER BY is_primary DESC,sort_order,id`:`SELECT id,store_name,button_label,url,is_primary,is_active,sort_order FROM product_purchase_links WHERE product_id=? ORDER BY is_primary DESC,sort_order,id`]:kind==='services'?[`SELECT * FROM service_images WHERE service_id=? ORDER BY sort_order,id`,`SELECT * FROM service_list_items WHERE service_id=? ORDER BY sort_order,id`,`SELECT * FROM service_process_steps WHERE service_id=? ORDER BY sort_order,id`]:[`SELECT * FROM news_images WHERE article_id=? ORDER BY sort_order,id`];
 const lists=await Promise.all(queries.map(sql=>rows<RowDataPacket>(db,sql,[key])));
 const mediaIds=[Number(parent.cover_media_id),...lists[0]!.map(row=>Number(row.media_id)),...(kind==='products'?lists[2]!.map(row=>Number(row.media_id)):[])].filter(id=>Number.isSafeInteger(id)&&id>0);
 const found=mediaIds.length?await rows<RowDataPacket>(db,`SELECT id,secure_url,alt_text FROM media_assets WHERE id IN (${[...new Set(mediaIds)].map(()=>'?').join(',')}) AND deleted_at IS NULL`,[...new Set(mediaIds)]):[];
 const map=new Map(found.map(row=>[Number(row.id),row]));
 if(mediaIds.some(id=>!map.has(id)))throw new HttpError(409,'MEDIA_UNAVAILABLE','Gambar yang tersimpan tidak tersedia. Pulihkan gambar tersebut sebelum mengedit konten.');
 return {record:parent,cover:photo(map.get(Number(parent.cover_media_id))),images:lists[0]!.map(row=>({...row,media:photo(map.get(Number(row.media_id)))})),
 ...(kind==='products'?{features:lists[1],variants:lists[2]!.map(row=>({...row,media:photo(map.get(Number(row.media_id))),final_price:parent.base_price==null?null:Math.round((Number(parent.base_price)+Number(row.price_adjustment))*100)/100})),purchaseLinks:lists[3]}:{}),
 ...(kind==='services'?{items:lists[1],processSteps:lists[2]}:{})};
}
async function sync(db:Executor,t:string,fk:string,parent:number,items:Record<string,unknown>[],itemIds:(number|null)[],fields:string[],softDelete=false){
 const old=await rows<RowDataPacket>(db,`SELECT * FROM ${t} WHERE ${fk}=? ORDER BY id FOR UPDATE`,[parent]);
 const existing=new Set(old.map(row=>Number(row.id))),selected=new Set(itemIds.filter((id):id is number=>id!==null));
 for(const id of selected)if(!existing.has(id))throw new HttpError(409,'VALIDATION_ERROR','Item terkait berubah. Muat ulang halaman.');
 for(const row of old)if(!selected.has(Number(row.id))){if(softDelete){if(row.is_active)await write(db,`UPDATE ${t} SET is_active=0,is_primary=0 WHERE id=? AND ${fk}=?`,[row.id,parent]);}else await write(db,`DELETE FROM ${t} WHERE id=? AND ${fk}=?`,[row.id,parent]);}
 for(const [index,item] of items.entries()){
  const values=fields.map(field=>item[field]??null),id=itemIds[index];
  if(id)await write(db,`UPDATE ${t} SET ${fields.map(field=>`${field}=?`).join(',')},sort_order=? WHERE id=? AND ${fk}=?`,[...values,index,id,parent]);
  else await write(db,`INSERT INTO ${t} (${fk},${fields.join(',')},sort_order) VALUES (?,${fields.map(()=>'?').join(',')},?)`,[parent,...values,index]);
 }
}
async function images(db:Executor,t:string,fk:string,key:number,cover:number|null,gallery:number[],includeCover:boolean,meta?:Map<number,RowDataPacket>){
 const old=await rows<RowDataPacket>(db,`SELECT * FROM ${t} WHERE ${fk}=?`,[key]);
 const byMedia=new Map(old.map(row=>[Number(row.media_id),Number(row.id)]));
 const oldMeta=new Map(old.map(row=>[Number(row.media_id),row]));
 const chosen=includeCover&&cover?[cover,...gallery]:gallery;
 const values=chosen.map((mediaId,index)=>({media_id:mediaId,...(includeCover?{is_cover:index===0?1:0}:{}),...(meta?{alt_text:oldMeta.get(mediaId)?.alt_text??meta.get(mediaId)?.alt_text??null,caption:oldMeta.get(mediaId)?.caption??meta.get(mediaId)?.caption??null}:{})}));
 await sync(db,t,fk,key,values,chosen.map(mediaId=>byMedia.get(mediaId)??null),meta?['media_id','alt_text','caption']:includeCover?['media_id','is_cover']:['media_id']);
}
export async function savePostEditor(db:Pool,kind:Kind,key:number,raw:unknown,actor:Actor,requestId:string,caps:CmsCapabilities,mediaRoot:string){
 if(!actor.permissions.has(`${kind}.update`))throw new HttpError(403,'FORBIDDEN','Tidak ada izin untuk mengubah konten.');
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new HttpError(400,'VALIDATION_ERROR','Formulir tidak valid.');
 const body=raw as Record<string,unknown>;
 return transaction(db,async conn=>{
  const before=await record(conn,resources[kind]!,key,true);
  if(!before)throw new HttpError(404,'NOT_FOUND','Konten tidak ditemukan.');
  if(before.status==='archived')throw new HttpError(409,'ARCHIVED','Konten yang diarsipkan tidak dapat diedit melalui formulir ini.');
  const publish=body.action==='publish'||body.status==='published';
  if(publish&&before.status!=='published'&&!actor.permissions.has(`${kind}.publish`))throw new HttpError(403,'FORBIDDEN','Tidak ada izin menerbitkan konten.');
  const status=publish||before.status==='published'?'published':'draft';
  let parent:Record<string,unknown>={};
  if(kind==='products'){
   const vr=requiredArray(body.variants,'Varian'),fr=requiredArray(body.features,'Fitur'),pr=requiredArray(body.platforms,'Tautan');
   const vi=ids(vr),fi=ids(fr),pi=ids(pr);
   const input=productFormInput({...body,variants:clean(vr),features:clean(fr),platforms:clean(pr)},{socialMediaV2:caps.socialMediaV2.enabled,productVariantMedia:caps.productVariantMedia.enabled});
   if(input.features.length!==fi.length)throw new HttpError(400,'VALIDATION_ERROR','Hapus baris fitur yang kosong sebelum menyimpan.');
   for(const variant of input.variants){const adjustment=Math.round((variant.price-Number(input.base_price))*100)/100;if(Math.abs(adjustment)>999_999_999)throw new HttpError(400,'VALIDATION_ERROR','Selisih harga varian melampaui batas yang didukung.');}
   const mediaIds=[input.cover_media_id,...input.gallery_media_ids,...(caps.productVariantMedia.enabled?input.variants.map(row=>row.media_id):[])].filter((id):id is number=>Boolean(id));
   await validateMediaIds(conn,mediaIds,'postingan',mediaRoot);
   if(input.category_id&&input.category_id!==Number(before.category_id)&&!((await rows<RowDataPacket>(conn,'SELECT id FROM product_categories WHERE id=? AND is_active=1',[input.category_id])).length))throw new HttpError(400,'INVALID_REFERENCE','Kategori tidak tersedia.');
   if(status==='published'&&(!input.category_id||!input.cover_media_id||!input.description||!input.platforms.length||input.base_price==null&&!input.price_note))throw new HttpError(400,'PUBLISH_INCOMPLETE','Lengkapi produk sebelum menerbitkan.');
   parent={name:input.name,category_id:input.category_id??null,product_type:input.product_type??before.product_type,description:input.description,short_description:input.short_description,cover_media_id:input.cover_media_id??null,base_price:input.base_price??null,currency_code:input.currency_code,availability_label:input.availability_label??null,price_note:input.price_note??null,lead_time_text:input.lead_time_text??null,minimum_order_quantity:input.minimum_order_quantity??null};
   await images(conn,'product_images','product_id',key,input.cover_media_id??null,input.gallery_media_ids,true);
   await sync(conn,'product_features','product_id',key,input.features.map(row=>({...row})),fi,['label','value_text']);
   await sync(conn,'product_variants','product_id',key,input.variants.map(row=>({name:row.name,price_adjustment:Math.round((row.price-Number(input.base_price))*100)/100,stock_quantity:row.stock_quantity,is_active:row.is_active?1:0,...(caps.productVariantMedia.enabled?{media_id:row.media_id??null}:{})})),vi,caps.productVariantMedia.enabled?['name','price_adjustment','stock_quantity','is_active','media_id']:['name','price_adjustment','stock_quantity','is_active']);
   const links:Record<string,unknown>[]=[];
   const previousLinks=await rows<RowDataPacket>(conn,'SELECT id,button_label,url,is_active FROM product_purchase_links WHERE product_id=? FOR UPDATE',[key]);
   const previousLinkById=new Map(previousLinks.map(row=>[Number(row.id),row]));
   for(const [index,link] of input.platforms.entries()){
    let url=link.url??'',accountId:number|null=null;
    if(link.platform==='whatsapp'){
     if(caps.socialMediaV2.enabled){const chosen=await account(conn,link.social_link_id!,true);if(!chosen||chosen.canonical_code!=='whatsapp'||!chosen.is_active)throw new HttpError(400,'INVALID_WHATSAPP_ACCOUNT','Pilih akun WhatsApp aktif.');url=chosen.url;accountId=Number(chosen.id);}
     else url=String(pi[index]?previousLinkById.get(pi[index])?.url??'':await globalWhatsApp(conn)??'');
    }
    if(!validPurchaseUrl(url))throw new HttpError(400,'VALIDATION_ERROR','Tautan pembelian tidak valid.');
    links.push({store_name:platformNames[link.platform],button_label:pi[index]?previousLinkById.get(pi[index])?.button_label??platformNames[link.platform]:platformNames[link.platform],url,is_primary:index===0?1:0,is_active:1,...(caps.socialMediaV2.enabled?{social_link_id:accountId}:{})});
   }
   await sync(conn,'product_purchase_links','product_id',key,links,pi,caps.socialMediaV2.enabled?['store_name','button_label','url','is_primary','is_active','social_link_id']:['store_name','button_label','url','is_primary','is_active'],true);
  }else if(kind==='services'){
   const ir=requiredArray(body.items,'Informasi layanan'),sr=requiredArray(body.process_steps,'Langkah');const ii=ids(ir),si=ids(sr);
   const input=validateServiceCreate({...body,items:clean(ir),process_steps:clean(sr),status},true);
   await validateMediaIds(conn,[input.cover_media_id,...input.gallery_media_ids].filter((id):id is number=>Boolean(id)),'postingan',mediaRoot);
   if(input.category_id&&input.category_id!==Number(before.category_id)&&!((await rows<RowDataPacket>(conn,'SELECT id FROM service_categories WHERE id=? AND is_active=1',[input.category_id])).length))throw new HttpError(400,'INVALID_REFERENCE','Kategori tidak tersedia.');
   parent={name:input.name,category_id:input.category_id,description:input.sanitizedDescription||null,short_description:input.summary,cover_media_id:input.cover_media_id,pricing_type:input.pricing_type,starting_price:input.starting_price,currency_code:input.currency_code,price_note:input.price_note||null,estimated_duration:input.estimated_duration||null,primary_cta_label:input.primary_cta_label||null,primary_cta_url:input.primary_cta_url||null};
   await images(conn,'service_images','service_id',key,input.cover_media_id,input.gallery_media_ids,true);
   await sync(conn,'service_list_items','service_id',key,input.items.map(row=>({...row})),ii,['item_type','label']);
   await sync(conn,'service_process_steps','service_id',key,input.process_steps.map(row=>({title:row.title,description:row.description||null})),si,['title','description']);
  }else{
   const input=validateNewsCreate({...body,action:status==='published'?'publish':'draft'},true);
   const valid=await validateMediaIds(conn,[input.cover_media_id,...input.gallery_media_ids].filter((id):id is number=>Boolean(id)),'postingan',mediaRoot);
   const meta=new Map(valid.map(row=>[Number(row.id),row]));
   if(input.category_id&&input.category_id!==Number(before.category_id)&&!((await rows<RowDataPacket>(conn,'SELECT id FROM news_categories WHERE id=? AND is_active=1',[input.category_id])).length))throw new HttpError(400,'INVALID_REFERENCE','Kategori tidak tersedia.');
   if(input.author){const isUser=input.author.source==='user',t=isUser?'users':'team_members',state=isUser?'active':'published';const same=Number(isUser?before.author_user_id:before.author_team_member_id)===input.author.id;if(!same&&!((await rows<RowDataPacket>(conn,`SELECT id FROM ${t} WHERE id=? AND status=? AND deleted_at IS NULL`,[input.author.id,state])).length))throw new HttpError(400,'INVALID_REFERENCE','Penulis tidak tersedia.');}
   parent={title:input.title,content_type:input.content_type,category_id:input.category_id,excerpt:input.excerpt,body:input.body||null,cover_media_id:input.cover_media_id,author_user_id:input.author?.source==='user'?input.author.id:null,author_team_member_id:input.author?.source==='team'?input.author.id:null,reading_time_minutes:input.reading_time_minutes};
   await images(conn,'news_images','article_id',key,input.cover_media_id,input.gallery_media_ids,false,meta);
  }
  if(status==='published'&&before.status!=='published'){parent.status='published';parent.published_at=new Date().toISOString().slice(0,23).replace('T',' ');}
  if(kind!=='news')parent.updated_by=actor.id;
  const fields=Object.keys(parent);
  await write(conn,`UPDATE ${table[kind]} SET ${fields.map(field=>`${field}=?`).join(',')} WHERE id=?`,[...fields.map(field=>parent[field]),key]);
  const after=await getPostEditor(conn,kind,key,caps);
  await revision(conn,{entityType:table[kind],entityId:key,snapshot:{...after.record,images:after.images.map(item=>Number((item as RowDataPacket).id))},actorId:actor.id,summary:'Updated complete post'});
  await audit(conn,{actorId:actor.id,action:`${table[kind]}.update`,entityType:table[kind],entityId:key,requestId,before,after});
  return after.record;
 });
}
