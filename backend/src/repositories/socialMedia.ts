import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { Executor } from '../database/pool';
import { rows, write } from '../database/pool';

export type PlatformRow = RowDataPacket & { id:number; platform_code:string; name:string; icon_key:string; sort_order:number };
export type AccountRow = RowDataPacket & { id:number; platform_id:number; canonical_code:string; platform_name:string; platform_code:string; label:string; description:string|null; url:string; is_active:number; sort_order:number };
const accountSelect=`SELECT a.id,a.platform_id,p.platform_code AS canonical_code,p.name AS platform_name,
    a.platform_code,a.label,a.description,a.url,a.is_active,a.sort_order,a.created_at,a.updated_at
    FROM social_links a JOIN social_platforms p ON p.id=a.platform_id`;
export const platforms=(db:Executor)=>rows<PlatformRow>(db,'SELECT id,platform_code,name,icon_key,sort_order FROM social_platforms ORDER BY sort_order,id');
export const accounts=(db:Executor)=>rows<AccountRow>(db,`${accountSelect} ORDER BY p.sort_order,a.sort_order,a.id`);
export async function account(db:Executor,id:number,lock=false):Promise<AccountRow|null>{return (await rows<AccountRow>(db,`${accountSelect} WHERE a.id=?${lock?' FOR UPDATE':''}`,[id]))[0]??null;}
export async function platform(db:PoolConnection,code:string,lock=false):Promise<PlatformRow|null>{return (await rows<PlatformRow>(db,`SELECT id,platform_code,name,icon_key,sort_order FROM social_platforms WHERE platform_code=?${lock?' FOR UPDATE':''}`,[code]))[0]??null;}
export async function countOnPlatform(db:Executor,platformId:number):Promise<number>{return Number((await rows<RowDataPacket>(db,'SELECT COUNT(*) AS total FROM social_links WHERE platform_id=?',[platformId]))[0]?.total??0);}
export async function references(db:Executor,id:number):Promise<number>{
  const present=await rows<RowDataPacket>(db,"SELECT TABLE_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='social_link_id' AND TABLE_NAME IN ('product_purchase_links','contact_social_placements','footer_social_placements')");
  const tables=new Set(present.map(row=>String(row.TABLE_NAME)));
  let count=0;
  for(const table of ['product_purchase_links','contact_social_placements','footer_social_placements'] as const){
    if(tables.has(table))count+=Number((await rows<RowDataPacket>(db,`SELECT COUNT(*) AS total FROM ${table} WHERE social_link_id=?`,[id]))[0]?.total??0);
  }
  return count;
}
export async function insert(db:PoolConnection,input:{platformId:number;legacyCode:string;label:string;description:string|null;url:string;active:boolean;order:number}):Promise<number>{
  const result=await write(db,'INSERT INTO social_links (platform_id,platform_code,label,description,url,icon_key,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?)',
    [input.platformId,input.legacyCode,input.label,input.description,input.url,null,input.active?1:0,input.order]);
  return result.insertId;
}
export async function update(db:PoolConnection,id:number,patch:{label?:string;description?:string|null;url?:string;is_active?:boolean;sort_order?:number}):Promise<void>{
  const fields: string[]=[],values:unknown[]=[];
  for(const [key,value] of Object.entries(patch)) {fields.push(`${key}=?`);values.push(key==='is_active'?(value?1:0):value);}
  if(!fields.length)return;
  await write(db,`UPDATE social_links SET ${fields.join(',')} WHERE id=?`,[...values,id]);
}
export async function remove(db:PoolConnection,id:number):Promise<void>{await write(db,'DELETE FROM social_links WHERE id=?',[id]);}
export async function whatsappOptions(db:Executor):Promise<{id:number;label:string;url:string}[]>{return rows<RowDataPacket>(db,"SELECT a.id,a.label,a.url FROM social_links a JOIN social_platforms p ON p.id=a.platform_id WHERE p.platform_code='whatsapp' AND a.is_active=1 ORDER BY a.sort_order,a.id LIMIT 5") as Promise<{id:number;label:string;url:string}[]>;}
