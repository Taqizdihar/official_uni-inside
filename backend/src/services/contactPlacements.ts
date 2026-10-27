import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,write,transaction,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {platformCodes,accountUrl,type PlatformCode} from '../schemas/socialMedia';
import {validButtonDestination} from './homepageSections';
import {v2ColumnReady,v2TableReady} from './v2Schema';
import {HttpError,parse} from '../utils/http';

const inputSchema=z.strictObject({socialLinkIds:z.array(z.number().int().positive()).max(8),craftUrl:z.string().max(1000)});
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function contactPlacementsReady(db:Executor):Promise<boolean>{
 return await v2ColumnReady(db,'contact_section_settings','craft_url')
  &&await v2ColumnReady(db,'social_links','platform_id')
  &&await v2TableReady(db,'contact_social_placements',['id','social_link_id','position'],{social_link_id:'social_links'},[['social_link_id'],['position']])
  &&await v2TableReady(db,'social_platforms',['id','platform_code']);
}
async function read(db:Executor,lock=false){
 const settings=(await rows<RowDataPacket>(db,`SELECT craft_url FROM contact_section_settings WHERE id=1${lock?' FOR UPDATE':''}`))[0];
 if(!settings)throw new HttpError(503,'CONTACT_INCOMPLETE','Pengaturan Contact Us belum tersedia.');
 const placements=await rows<RowDataPacket>(db,`SELECT p.social_link_id,p.position,a.label,a.url,a.is_active,s.platform_code
  FROM contact_social_placements AS p JOIN social_links AS a ON a.id=p.social_link_id
  JOIN social_platforms AS s ON s.id=a.platform_id ORDER BY p.position,p.id${lock?' FOR UPDATE':''}`);
 return {socialLinkIds:placements.map(item=>Number(item.social_link_id)),craftUrl:String(settings.craft_url??''),placements};
}
export async function getContactPlacements(db:Executor,enabled=false){
 if(!enabled||!await contactPlacementsReady(db))return {enabled:false,reason:enabled?'DATABASE_MIGRATION_PENDING':'FEATURE_DISABLED',socialLinkIds:[],craftUrl:'',version:null};
 let value:Awaited<ReturnType<typeof read>>;
 try{value=await read(db);}catch(error){if(error instanceof HttpError&&error.code==='CONTACT_INCOMPLETE')return {enabled:false,reason:'REFERENCE_DATA_PENDING',socialLinkIds:[],craftUrl:'',version:null};throw error;}
 if(value.placements.some(item=>{if(Number(item.is_active)!==1||!platformCodes.includes(String(item.platform_code) as PlatformCode))return true;try{accountUrl(String(item.url),item.platform_code as PlatformCode);return false;}catch{return true;}}))return {enabled:false,reason:'REFERENCE_DATA_PENDING',socialLinkIds:value.socialLinkIds,craftUrl:value.craftUrl,version:null};
 return {enabled:true,socialLinkIds:value.socialLinkIds,craftUrl:value.craftUrl,version:hash({ids:value.socialLinkIds,craftUrl:value.craftUrl})};
}
export async function saveContactPlacements(db:Pool,body:unknown,actorId:number,requestId:string,enabled=false){
 if(!enabled||!await contactPlacementsReady(db))throw new HttpError(503,'FEATURE_UNAVAILABLE','Penyimpanan penempatan Contact Us belum tersedia.');
 const input=parse(inputSchema.extend({expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)}),body);
 if(new Set(input.socialLinkIds).size!==input.socialLinkIds.length)throw new HttpError(400,'VALIDATION_ERROR','Akun tidak boleh dipilih dua kali.');
 if(input.craftUrl&&!validButtonDestination(input.craftUrl))throw new HttpError(400,'VALIDATION_ERROR','Gunakan URL Craft HTTPS atau path internal yang aman.');
 return transaction(db,async conn=>{
  const before=await read(conn,true);
  if(hash({ids:before.socialLinkIds,craftUrl:before.craftUrl})!==input.expectedVersion)throw new HttpError(409,'CONTENT_CHANGED','Penempatan telah diubah anggota lain. Muat ulang.');
  if(input.socialLinkIds.length){
   const accounts=await rows<RowDataPacket>(conn,`SELECT a.id,a.is_active,a.url,p.platform_code FROM social_links AS a
    JOIN social_platforms AS p ON p.id=a.platform_id WHERE a.id IN (${input.socialLinkIds.map(()=>'?').join(',')}) FOR UPDATE`,input.socialLinkIds);
   if(accounts.length!==input.socialLinkIds.length||accounts.some(item=>Number(item.is_active)!==1||!platformCodes.includes(String(item.platform_code) as PlatformCode)))throw new HttpError(400,'INVALID_REFERENCE','Pilih hanya akun aktif dengan ikon yang didukung.');
   if(accounts.filter(item=>item.platform_code==='whatsapp').length>1)throw new HttpError(400,'VALIDATION_ERROR','Hanya satu WhatsApp dapat dipilih.');
   for(const item of accounts)accountUrl(String(item.url),item.platform_code as PlatformCode);
  }
  const codes=await rows<RowDataPacket>(conn,`SELECT a.id,p.platform_code FROM social_links AS a JOIN social_platforms AS p ON p.id=a.platform_id WHERE a.id IN (${input.socialLinkIds.length?input.socialLinkIds.map(()=>'?').join(','):'NULL'})`,input.socialLinkIds);
  const whatsapp=codes.find(item=>item.platform_code==='whatsapp');
  const ordered=whatsapp?[Number(whatsapp.id),...input.socialLinkIds.filter(id=>id!==Number(whatsapp.id))]:input.socialLinkIds;
  if(JSON.stringify(ordered)!==JSON.stringify(before.socialLinkIds)||input.craftUrl!==before.craftUrl){
   await write(conn,'DELETE FROM contact_social_placements');
   for(const [index,id] of ordered.entries())await write(conn,'INSERT INTO contact_social_placements (social_link_id,position) VALUES (?,?)',[id,index+1]);
   await write(conn,'UPDATE contact_section_settings SET craft_url=?,updated_by=? WHERE id=1',[input.craftUrl||null,actorId]);
   await revision(conn,{entityType:'contact_section_settings:1',entityId:1,snapshot:{socialLinkIds:ordered,craftUrl:input.craftUrl},actorId,summary:'Updated Contact placements'});
   await audit(conn,{actorId,action:'homepage.contact.placements.update',entityType:'contact_section_settings',entityId:1,requestId,before:{socialLinkIds:before.socialLinkIds,craftUrl:before.craftUrl},after:{socialLinkIds:ordered,craftUrl:input.craftUrl}});
  }
  const value=await read(conn);return {enabled:true,socialLinkIds:value.socialLinkIds,craftUrl:value.craftUrl,version:hash({ids:value.socialLinkIds,craftUrl:value.craftUrl})};
 });
}
export async function publicContactPlacements(db:Executor,enabled=false){
 if(!enabled||!await contactPlacementsReady(db))return null;
 let value:Awaited<ReturnType<typeof read>>;
 try{value=await read(db);}catch(error){if(error instanceof HttpError&&error.code==='CONTACT_INCOMPLETE')return null;throw error;}
 if(!value.placements.length)return null;
 const accounts=value.placements.filter(item=>{
  if(!item.is_active||!platformCodes.includes(String(item.platform_code) as PlatformCode))return false;
  try{accountUrl(String(item.url),item.platform_code as PlatformCode);return true;}catch{return false;}
 }).map(item=>({id:Number(item.social_link_id),platform_code:String(item.platform_code),label:String(item.label),url:String(item.url)}));
 return accounts.length?{accounts,craftUrl:value.craftUrl}:null;
}
