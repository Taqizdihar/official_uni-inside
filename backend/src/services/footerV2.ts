import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,write,transaction,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {footerMapsEmbedSchema} from '../schemas/footerFuture';
import {accountUrl,platformCodes,type PlatformCode} from '../schemas/socialMedia';
import {v2ColumnReady,v2TableReady} from './v2Schema';
import {HttpError,parse} from '../utils/http';

const fields=z.strictObject({footer_description:z.string().trim().max(1000).nullable(),public_email:z.union([z.email().max(254),z.null()]),public_phone:z.union([z.string().trim().min(5).max(50).regex(/^[+0-9().\s-]+$/).refine(value=>value.replace(/\D/g,'').length>=5),z.null()]),address_text:z.string().trim().max(500).nullable()});
const inputSchema=fields.extend({socialLinkIds:z.array(z.number().int().positive()).max(10),google_maps_embed_url:z.union([footerMapsEmbedSchema,z.literal('')]),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function footerV2Ready(db:Executor){
 return await v2ColumnReady(db,'site_settings','google_maps_embed_url')
  &&await v2ColumnReady(db,'social_links','platform_id')
  &&await v2TableReady(db,'social_platforms',['id','platform_code'])
  &&await v2TableReady(db,'footer_social_placements',['id','social_link_id','position'],{social_link_id:'social_links'},[['social_link_id'],['position']]);
}
async function read(db:Executor,lock=false){
 const record=(await rows<RowDataPacket>(db,`SELECT footer_description,public_email,public_phone,address_text,google_maps_embed_url FROM site_settings WHERE id=1${lock?' FOR UPDATE':''}`))[0];
 if(!record)throw new HttpError(503,'FOOTER_INCOMPLETE','Pengaturan Footer belum tersedia.');
 const accounts=await rows<RowDataPacket>(db,`SELECT p.social_link_id,p.position,a.label,a.url,a.is_active,s.platform_code
  FROM footer_social_placements AS p JOIN social_links AS a ON a.id=p.social_link_id
  JOIN social_platforms AS s ON s.id=a.platform_id ORDER BY p.position,p.id${lock?' FOR UPDATE':''}`);
 const settings={footer_description:record.footer_description??null,public_email:record.public_email??null,public_phone:record.public_phone??null,address_text:record.address_text??null};
 return {settings,socialLinkIds:accounts.map(item=>Number(item.social_link_id)),mapUrl:String(record.google_maps_embed_url??''),accounts};
}
export async function getFooterV2(db:Executor,enabled:boolean){
 if(!enabled||!await footerV2Ready(db))return null;
 let value:Awaited<ReturnType<typeof read>>;
 try{value=await read(db);}catch(error){if(error instanceof HttpError&&error.code==='FOOTER_INCOMPLETE')return null;throw error;}
 if(value.accounts.some(item=>{if(Number(item.is_active)!==1||!platformCodes.includes(String(item.platform_code) as PlatformCode))return true;try{accountUrl(String(item.url),item.platform_code as PlatformCode);return false;}catch{return true;}}))return null;
 return {settings:value.settings,socialLinkIds:value.socialLinkIds,mapUrl:value.mapUrl,version:hash({settings:value.settings,ids:value.socialLinkIds,mapUrl:value.mapUrl}),capabilities:{footerBaseSettings:{enabled:true},footerSocialPlacements:{enabled:true},footerMapsEmbed:{enabled:true}}};
}
export async function saveFooterV2(db:Pool,raw:unknown,actorId:number,requestId:string){
 if(!await footerV2Ready(db))throw new HttpError(503,'FEATURE_UNAVAILABLE','Penyimpanan Footer V2 belum tersedia.');
 const input=parse(inputSchema,raw);
 if(new Set(input.socialLinkIds).size!==input.socialLinkIds.length)throw new HttpError(400,'VALIDATION_ERROR','Akun Footer tidak boleh dipilih dua kali.');
 return transaction(db,async conn=>{
  const before=await read(conn,true);
  if(input.expectedVersion!==hash({settings:before.settings,ids:before.socialLinkIds,mapUrl:before.mapUrl}))throw new HttpError(409,'CONTENT_CHANGED','Footer telah diubah anggota lain. Muat ulang.');
  if(input.socialLinkIds.length){
   const accounts=await rows<RowDataPacket>(conn,`SELECT a.id,a.is_active,a.url,p.platform_code FROM social_links AS a JOIN social_platforms AS p ON p.id=a.platform_id WHERE a.id IN (${input.socialLinkIds.map(()=>'?').join(',')}) FOR UPDATE`,input.socialLinkIds);
   if(accounts.length!==input.socialLinkIds.length||accounts.some(item=>Number(item.is_active)!==1||!platformCodes.includes(String(item.platform_code) as PlatformCode)))throw new HttpError(400,'INVALID_REFERENCE','Pilih hanya akun aktif yang memiliki ikon resmi.');
   for(const account of accounts)accountUrl(String(account.url),account.platform_code as PlatformCode);
  }
  const settings={footer_description:input.footer_description,public_email:input.public_email,public_phone:input.public_phone,address_text:input.address_text};
  const changed=JSON.stringify(settings)!==JSON.stringify(before.settings)||JSON.stringify(input.socialLinkIds)!==JSON.stringify(before.socialLinkIds)||input.google_maps_embed_url!==before.mapUrl;
  if(changed){
   await write(conn,'UPDATE site_settings SET footer_description=?,public_email=?,public_phone=?,address_text=?,google_maps_embed_url=?,updated_by=? WHERE id=1',[input.footer_description,input.public_email,input.public_phone,input.address_text,input.google_maps_embed_url||null,actorId]);
   await write(conn,'DELETE FROM footer_social_placements');
   for(const [index,id] of input.socialLinkIds.entries())await write(conn,'INSERT INTO footer_social_placements (social_link_id,position) VALUES (?,?)',[id,index+1]);
   const after={settings,ids:input.socialLinkIds,mapUrl:input.google_maps_embed_url};
   await revision(conn,{entityType:'site_settings:footer',entityId:1,snapshot:after,actorId,summary:'Updated Footer'});
   await audit(conn,{actorId,action:'footer.update',entityType:'site_settings',entityId:1,requestId,before,after});
  }
  const value=await read(conn);
  return {settings:value.settings,socialLinkIds:value.socialLinkIds,mapUrl:value.mapUrl,version:hash({settings:value.settings,ids:value.socialLinkIds,mapUrl:value.mapUrl}),capabilities:{footerBaseSettings:{enabled:true},footerSocialPlacements:{enabled:true},footerMapsEmbed:{enabled:true}}};
 });
}
export async function publicFooterV2(db:Executor,enabled:boolean){
 if(!enabled||!await footerV2Ready(db))return null;
 let value:Awaited<ReturnType<typeof read>>;
 try{value=await read(db);}catch(error){if(error instanceof HttpError&&error.code==='FOOTER_INCOMPLETE')return null;throw error;}
 const accounts=value.accounts.filter(item=>{
  if(!item.is_active||!platformCodes.includes(String(item.platform_code) as PlatformCode))return false;
  try{accountUrl(String(item.url),item.platform_code as PlatformCode);return true;}catch{return false;}
 }).map(item=>({id:Number(item.social_link_id),platform_code:String(item.platform_code),label:String(item.label),url:String(item.url)}));
 return {accounts:accounts.length?accounts:null,mapUrl:value.mapUrl&&footerMapsEmbedSchema.safeParse(value.mapUrl).success?value.mapUrl:null};
}
