import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import { transaction } from '../database/pool';
import { audit } from '../repositories/audit';
import * as repo from '../repositories/socialMedia';
import { accountCreateSchema,accountPatchSchema,accountUrl,completeLabel,type PlatformCode } from '../schemas/socialMedia';
import { HttpError, parse } from '../utils/http';

type Actor={id:number;permissions:Set<string>};
const view=(actor:Actor)=>{if(!actor.permissions.has('settings.view'))throw new HttpError(403,'FORBIDDEN','Anda tidak memiliki izin melihat Sosial Media.');};
const edit=(actor:Actor)=>{if(!actor.permissions.has('settings.update'))throw new HttpError(403,'FORBIDDEN','Anda tidak memiliki izin mengubah Sosial Media.');};
export async function listPlatforms(db:Pool,actor:Actor){view(actor);return repo.platforms(db);}
export async function listAccounts(db:Pool,actor:Actor){view(actor);return repo.accounts(db);}
export async function getAccount(db:Pool,id:number,actor:Actor){view(actor);const found=await repo.account(db,id);if(!found)throw new HttpError(404,'NOT_FOUND','Akun tidak ditemukan.');return found;}
export async function createAccount(db:Pool,raw:unknown,actor:Actor,requestId:string){
  edit(actor);const input=parse(accountCreateSchema,raw);
  const label=completeLabel(input.platform_code,input.label_suffix),url=accountUrl(input.url,input.platform_code);
  return transaction(db,async conn=>{
    // Lock the shared parent before counting. Concurrent creates for one platform serialize here.
    const platform=await repo.platform(conn,input.platform_code,true);
    if(!platform)throw new HttpError(400,'INVALID_PLATFORM','Platform belum tersedia.');
    if(await repo.countOnPlatform(conn,Number(platform.id))>=5)throw new HttpError(409,'ACCOUNT_LIMIT','Batas maksimal lima akun untuk platform ini telah tercapai.');
    const id=await repo.insert(conn,{platformId:Number(platform.id),legacyCode:`acct_${randomUUID().replaceAll('-','')}`,label,description:input.description||null,url,active:input.is_active,order:input.sort_order});
    const saved=await repo.account(conn,id);
    await audit(conn,{actorId:actor.id,action:'social_links.create',entityType:'social_links',entityId:id,requestId,after:{id,platform_code:input.platform_code,label,is_active:input.is_active}});
    return saved;
  });
}
export async function updateAccount(db:Pool,id:number,raw:unknown,actor:Actor,requestId:string){
  edit(actor);const input=parse(accountPatchSchema,raw);
  if(!Object.keys(input).length)throw new HttpError(400,'VALIDATION_ERROR','Isi setidaknya satu perubahan.');
  return transaction(db,async conn=>{
    const before=await repo.account(conn,id,true);
    if(!before)throw new HttpError(404,'NOT_FOUND','Akun tidak ditemukan.');
    const code=before.canonical_code as PlatformCode;
    if(input.is_active===false && Number(before.is_active)===1 && await repo.references(conn,id)>0)throw new HttpError(409,'ACCOUNT_REFERENCED','Akun ini masih digunakan pada produk. Ganti akun pada produk terkait sebelum menonaktifkannya.');
    const patch={
      ...(input.label_suffix!==undefined?{label:completeLabel(code,input.label_suffix)}:{}),
      ...(input.description!==undefined?{description:input.description||null}:{}),
      ...(input.url!==undefined?{url:accountUrl(input.url,code)}:{}),
      ...(input.is_active!==undefined?{is_active:input.is_active}:{}),
      ...(input.sort_order!==undefined?{sort_order:input.sort_order}:{}),
    };
    await repo.update(conn,id,patch);
    const saved=await repo.account(conn,id);
    await audit(conn,{actorId:actor.id,action:'social_links.update',entityType:'social_links',entityId:id,requestId,before:{id,label:before.label,is_active:before.is_active},after:{id,label:saved?.label,is_active:saved?.is_active}});
    return saved;
  });
}
export async function deleteAccount(db:Pool,id:number,actor:Actor,requestId:string){
  edit(actor);
  return transaction(db,async conn=>{
    const before=await repo.account(conn,id,true);
    if(!before)throw new HttpError(404,'NOT_FOUND','Akun tidak ditemukan.');
    if(await repo.references(conn,id)>0)throw new HttpError(409,'ACCOUNT_REFERENCED','Akun ini masih digunakan pada produk. Ganti akun pada produk terkait sebelum menghapusnya.');
    await repo.remove(conn,id);
    await audit(conn,{actorId:actor.id,action:'social_links.delete',entityType:'social_links',entityId:id,requestId,before:{id,label:before.label,platform_code:before.canonical_code}});
    return {id};
  });
}
