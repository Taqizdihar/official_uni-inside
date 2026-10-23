import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,transaction,type Executor} from '../database/pool';
import * as repo from '../repositories/content';
import {audit,revision} from '../repositories/audit';
import {resources,slugify} from '../schemas/resources';
import {insertWithUniqueSlug} from './uniqueSlug';
import {validateMediaIds} from './mediaReferences';
import {HttpError,parse} from '../utils/http';
import {validatePartner,validateTeamMember,type TeamMemberInput,type PartnerInput} from '../contracts/aboutTeam';

export type HomepageCollection='team-members'|'partners';
type Actor={id:number;permissions:Set<string>};
const status=z.enum(['draft','published','archived']);
export const teamMemberInput=z.strictObject({full_name:z.string(),role_title:z.string(),short_bio:z.string(),photo_media_id:z.number().int().positive(),linkedin_url:z.string().nullable().default(null),instagram_url:z.string().nullable().default(null),x_url:z.string().nullable().default(null),github_url:z.string().nullable().default(null),status});
export const partnerInput=z.strictObject({name:z.string(),logo_media_id:z.number().int().positive(),website_url:z.string().nullable().default(null),status});
function permission(actor:Actor,code:string){if(!actor.permissions.has(code))throw new HttpError(403,'FORBIDDEN','Anda tidak memiliki izin untuk tindakan ini.');}
export async function validateCollectionMedia(db:Executor,id:number,kind:HomepageCollection,root:string){
  const media=(await validateMediaIds(db,[id],'utama',root))[0];
  if(!media||!['jpg','jpeg','png','webp','avif'].includes(String(media.format).toLowerCase()))throw new HttpError(400,'INVALID_MEDIA','Pilih gambar JPG, PNG, WebP, atau AVIF dari Halaman Utama.');
  const warnings:string[]=[];
  if(kind==='team-members'&&(Number(media.width_px)!==1080||Number(media.height_px)!==1350))warnings.push('Foto kartu tidak berukuran 1080 × 1350 px. Periksa pratinjau agar desain tidak terpotong.');
  return warnings;
}
export async function listHomepageCollection(db:Executor,kind:HomepageCollection,q:{page:number;limit:number;search?:string;status?:string}){
  const team=kind==='team-members',table=team?'team_members':'partners',mediaColumn=team?'photo_media_id':'logo_media_id',title=team?'full_name':'name';
  const clauses=['t.deleted_at IS NULL'],values:unknown[]=[];
  if(q.search){clauses.push(`t.${title} LIKE ?`);values.push(`%${q.search}%`);}
  if(q.status){clauses.push('t.status=?');values.push(q.status);}
  const where=clauses.join(' AND ');
  const fields=team?'t.full_name,t.role_title,t.short_bio,t.photo_media_id,t.linkedin_url,t.instagram_url,t.x_url,t.github_url':'t.name,t.logo_media_id,t.website_url';
  const items=await rows<RowDataPacket>(db,`SELECT t.id,${fields},t.status,t.updated_at,m.id AS image_id,m.secure_url,m.alt_text,m.format,m.width_px,m.height_px FROM ${table} t LEFT JOIN media_assets m ON m.id=t.${mediaColumn} AND m.deleted_at IS NULL WHERE ${where} ORDER BY t.sort_order ASC,t.id ASC LIMIT ? OFFSET ?`,[...values,q.limit,(q.page-1)*q.limit]);
  const total=Number((await rows<RowDataPacket>(db,`SELECT COUNT(*) AS total FROM ${table} t WHERE ${where}`,values))[0]?.total??0);
  return {items:items.map(item=>{const {image_id,secure_url,alt_text,format,width_px,height_px,...record}=item;return {...record,image:image_id?{id:Number(image_id),secure_url,alt_text,format,width_px,height_px}:null};}),total};
}
export async function saveHomepageCollection(db:Pool,kind:HomepageCollection,id:number|null,body:unknown,actor:Actor,requestId:string,root:string){
  const team=kind==='team-members',scope=team?'team':'partners',spec=resources[kind]!;
  permission(actor,`${scope}.${id===null?'create':'update'}`);
  const input=team?parse(teamMemberInput,body):parse(partnerInput,body);
  const issues=team?validateTeamMember(input as TeamMemberInput):validatePartner(input as PartnerInput);
  if(issues.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai.',issues);
  if(input.status==='published')permission(actor,`${scope}.publish`);
  if(input.status==='archived')permission(actor,`${scope}.archive`);
  return transaction(db,async conn=>{
    const before=id===null?null:await repo.record(conn,spec,id,true);
    if(id!==null&&!before)throw new HttpError(404,'NOT_FOUND','Konten tidak ditemukan.');
    if(before&&before.status!=='draft')permission(actor,`${scope}.publish`);
    const warnings=await validateCollectionMedia(conn,Number(team?(input as TeamMemberInput).photo_media_id:(input as PartnerInput).logo_media_id),kind,root);
    const data:Record<string,unknown>={...input,updated_by:actor.id};
    let savedId=id;
    if(savedId===null){
      data.created_by=actor.id;
      const base=slugify(team?(input as TeamMemberInput).full_name:(input as PartnerInput).name)||(team?'member':'partner');
      savedId=await insertWithUniqueSlug(conn,spec.table,base,slug=>repo.insertRecord(conn,spec,{...data,slug}));
    }else await repo.updateRecord(conn,spec,savedId,data);
    const record=await repo.record(conn,spec,savedId);
    await revision(conn,{entityType:spec.table,entityId:savedId,snapshot:record,actorId:actor.id,summary:id===null?'Created from Homepage editor':'Updated from Homepage editor'});
    await audit(conn,{actorId:actor.id,action:`${spec.table}.${id===null?'create':'update'}`,entityType:spec.table,entityId:savedId,requestId,before,after:record});
    return {record,warnings};
  });
}
