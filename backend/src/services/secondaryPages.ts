import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,write,transaction,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {HttpError,parse} from '../utils/http';
import {secondaryFields,secondarySpecs,supportedSecondaryFields,validateSecondaryValues,type SecondaryName} from '../contracts/secondaryPages';
const version=(edit:unknown)=>createHash('sha256').update(JSON.stringify(edit)).digest('hex');
const defaults=(name:SecondaryName)=>Object.fromEntries(supportedSecondaryFields(name).map(field=>[field.key,field.fallback]));
async function read(db:Executor,name:SecondaryName,lock=false){
 const fields=supportedSecondaryFields(name);
 const row=(await rows<RowDataPacket>(db,`SELECT ${fields.map(field=>field.column).join(',')} FROM page_settings WHERE page_key=?${lock?' FOR UPDATE':''}`,[secondarySpecs[name].pageKey]))[0];
 if(!row)throw new HttpError(503,'SECONDARY_NOT_READY','Pengaturan halaman belum tersedia. Hubungi administrator.');
 return Object.fromEntries(fields.map(field=>[field.key,String(row[field.column!]??'')]));
}
function response(name:SecondaryName,edit:Record<string,string>,enabled:boolean){return {edit,version:version(edit),enabled,capabilities:{contentSlots:false,manualBanner:false,projects:enabled&&name==='projects'},pending:Object.fromEntries(secondaryFields(name).filter(field=>!field.column).map(field=>[field.key,field.fallback]))};}
export async function getSecondaryPage(db:Executor,name:SecondaryName,projectsEnabled=false){
 if(name==='projects'&&!projectsEnabled)return {...response(name,defaults(name),false),reason:'Projects belum diaktifkan.'};
 if(name==='projects'){
  const ready=(await rows<RowDataPacket>(db,"SELECT page_key FROM page_settings WHERE page_key='projects'"))[0];
  if(!ready)return {...response(name,defaults(name),false),reason:'Singleton Projects belum tersedia.'};
 }
 return response(name,await read(db,name),true);
}
export async function saveSecondaryPage(db:Pool,name:SecondaryName,body:unknown,actorId:number,requestId:string,projectsEnabled=false){
 if(name==='projects'&&!projectsEnabled)throw new HttpError(403,'CAPABILITY_DISABLED','Pengaturan Projects belum diaktifkan.');
 const fields=supportedSecondaryFields(name);
 const input=parse(z.strictObject({edit:z.strictObject(Object.fromEntries(fields.map(field=>[field.key,z.string()]))),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)}),body);
 return transaction(db,async conn=>{
  const before=await read(conn,name,true);
  if(input.expectedVersion!==version(before))throw new HttpError(409,'CONTENT_CHANGED','Konten telah berubah. Muat ulang sebelum menyimpan.');
  const issues=validateSecondaryValues(name,input.edit,before);
  if(issues.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai.',issues);
  const changed=fields.filter(field=>input.edit[field.key]!==before[field.key]);
  if(changed.length){
   await write(conn,`UPDATE page_settings SET ${changed.map(field=>`${field.column}=?`).join(',')},updated_by=? WHERE page_key=?`,[...changed.map(field=>input.edit[field.key]),actorId,secondarySpecs[name].pageKey]);
   await revision(conn,{entityType:`page_settings:${secondarySpecs[name].pageKey}`,entityId:0,snapshot:input.edit,actorId,summary:'Updated secondary page'});
   await audit(conn,{actorId,action:`secondary.${name}.update`,entityType:'page_settings',entityId:0,requestId,before,after:input.edit});
  }
  return response(name,await read(conn,name),true);
 });
}
