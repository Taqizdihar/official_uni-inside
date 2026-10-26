import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,write,transaction,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {HttpError,parse} from '../utils/http';
import {secondaryFields,secondarySpecs,supportedSecondaryFields,validateSecondaryValues,type SecondaryName} from '../contracts/secondaryPages';
import {validateMediaIds} from './mediaReferences';

const version=(edit:unknown)=>createHash('sha256').update(JSON.stringify(edit)).digest('hex');
const defaults=(name:SecondaryName)=>Object.fromEntries(supportedSecondaryFields(name).map(field=>[field.key,field.fallback]));
const slotColumns=['id','page_settings_id','slot_key','value_type','text_value','media_id','updated_by'] as const;

/** Introspection prevents querying an absent or partially migrated V2 table. */
export async function secondarySlotsReady(db:Executor):Promise<boolean>{
 const columns=await rows<RowDataPacket>(db,"SELECT COLUMN_NAME,DATA_TYPE,COLUMN_TYPE,CHARACTER_MAXIMUM_LENGTH,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='secondary_page_content_slots'");
 const names=new Map(columns.map(row=>[String(row.COLUMN_NAME),row]));
 if(!slotColumns.every(name=>names.has(name))||names.get('id')?.DATA_TYPE!=='bigint'||names.get('page_settings_id')?.DATA_TYPE!=='bigint'||names.get('media_id')?.DATA_TYPE!=='bigint'||Number(names.get('slot_key')?.CHARACTER_MAXIMUM_LENGTH)<64||Number(names.get('text_value')?.CHARACTER_MAXIMUM_LENGTH)<1000||names.get('text_value')?.IS_NULLABLE!=='YES'||names.get('media_id')?.IS_NULLABLE!=='YES')return false;
 const valuesType=String(names.get('value_type')?.COLUMN_TYPE??'');
 if(!['text','media','mode'].every(value=>valuesType.includes(`'${value}'`)))return false;
 const constraints=await rows<RowDataPacket>(db,"SELECT c.CONSTRAINT_TYPE,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE AS k JOIN information_schema.TABLE_CONSTRAINTS AS c USING (CONSTRAINT_SCHEMA,TABLE_NAME,CONSTRAINT_NAME) WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME='secondary_page_content_slots'");
 const has=(type:string,column:string,target?:string)=>constraints.some(row=>row.CONSTRAINT_TYPE===type&&row.COLUMN_NAME===column&&(!target||row.REFERENCED_TABLE_NAME===target));
 if(!has('PRIMARY KEY','id')||!has('FOREIGN KEY','page_settings_id','page_settings')||!has('FOREIGN KEY','media_id','media_assets'))return false;
 const unique=await rows<RowDataPacket>(db,"SELECT INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_in_index FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='secondary_page_content_slots' AND NON_UNIQUE=0 GROUP BY INDEX_NAME");
 return unique.some(row=>row.columns_in_index==='page_settings_id,slot_key');
}

async function read(db:Executor,name:SecondaryName,slots:boolean,lock=false){
 const fields=supportedSecondaryFields(name);
 const row=(await rows<RowDataPacket>(db,`SELECT id,${fields.map(field=>field.column).join(',')} FROM page_settings WHERE page_key=?${lock?' FOR UPDATE':''}`,[secondarySpecs[name].pageKey]))[0];
 if(!row)throw new HttpError(503,'SECONDARY_NOT_READY','Pengaturan halaman belum tersedia. Hubungi administrator.');
 const edit=Object.fromEntries(fields.map(field=>[field.key,String(row[field.column!]??'')]));
 if(slots){
  const stored=await rows<RowDataPacket>(db,`SELECT slot_key,value_type,text_value,media_id FROM secondary_page_content_slots WHERE page_settings_id=?${lock?' FOR UPDATE':''}`,[row.id]);
  for(const field of secondaryFields(name).filter(item=>!item.column)){
   const item=stored.find(value=>value.slot_key===field.key);
   edit[field.key]=item?.value_type==='text'&&typeof item.text_value==='string'?item.text_value:field.fallback;
  }
  if(name==='products'){
   const mode=stored.find(item=>item.slot_key==='banner_mode');
   const media=stored.find(item=>item.slot_key==='banner_media_id');
   edit.banner_mode=mode?.value_type==='mode'&&['automatic','manual'].includes(String(mode.text_value))?String(mode.text_value):'automatic';
   edit.banner_media_id=media?.value_type==='media'&&media.media_id?String(media.media_id):'';
  }
 }
 return {id:Number(row.id),edit};
}
function response(name:SecondaryName,edit:Record<string,string>,enabled:boolean,slots=false){return {edit,version:version(edit),enabled,capabilities:{contentSlots:slots,manualBanner:slots&&name==='products',projects:enabled&&name==='projects'},pending:Object.fromEntries(secondaryFields(name).filter(field=>!field.column&&!slots).map(field=>[field.key,field.fallback]))};}
export async function getSecondaryPage(db:Executor,name:SecondaryName,projectsEnabled=false,slotsEnabled=false){
 if(name==='projects'&&!projectsEnabled)return {...response(name,defaults(name),false),reason:'Projects belum diaktifkan.'};
 if(name==='projects'){
  const ready=(await rows<RowDataPacket>(db,"SELECT page_key FROM page_settings WHERE page_key='projects'"))[0];
  if(!ready)return {...response(name,defaults(name),false),reason:'Singleton Projects belum tersedia.'};
 }
 const slots=name!=='projects'&&slotsEnabled&&await secondarySlotsReady(db);
 return response(name,(await read(db,name,slots)).edit,true,slots);
}

async function setSlot(db:Executor,pageId:number,key:string,type:'text'|'mode'|'media',value:string,actorId:number){
 const media=type==='media'?(value?Number(value):null):null;
 const text=type==='media'?null:value;
 await write(db,`INSERT INTO secondary_page_content_slots (page_settings_id,slot_key,value_type,text_value,media_id,updated_by)
 VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE value_type=VALUES(value_type),text_value=VALUES(text_value),media_id=VALUES(media_id),updated_by=VALUES(updated_by)`,[pageId,key,type,text,media,actorId]);
}
export async function saveSecondaryPage(db:Pool,name:SecondaryName,body:unknown,actorId:number,requestId:string,projectsEnabled=false,slotsEnabled=false,mediaRoot='uni-inside'){
 if(name==='projects'&&!projectsEnabled)throw new HttpError(403,'CAPABILITY_DISABLED','Pengaturan Projects belum diaktifkan.');
 const slots=name!=='projects'&&slotsEnabled&&await secondarySlotsReady(db);
 const fields=slots?secondaryFields(name):supportedSecondaryFields(name);
 const shape=Object.fromEntries(fields.map(field=>[field.key,z.string()]));
 if(slots&&name==='products')Object.assign(shape,{banner_mode:z.enum(['automatic','manual']),banner_media_id:z.string().regex(/^(?:[1-9]\d*)?$/)});
 const input=parse(z.strictObject({edit:z.strictObject(shape),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)}),body);
 return transaction(db,async conn=>{
  const before=await read(conn,name,slots,true);
  if(input.expectedVersion!==version(before.edit))throw new HttpError(409,'CONTENT_CHANGED','Konten telah berubah. Muat ulang sebelum menyimpan.');
  const issues=validateSecondaryValues(name,input.edit,before.edit,!slots);
  if(slots&&name==='products'&&input.edit.banner_mode==='manual'&&!input.edit.banner_media_id)issues.push({path:'banner_media_id',message:'Pilih gambar banner dari Manajemen Aset.'});
  if(issues.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai.',issues);
  const changed=fields.filter(field=>input.edit[field.key]!==before.edit[field.key]);
  const columns=changed.filter(field=>field.column),slotFields=changed.filter(field=>!field.column);
  if(name==='products'&&slots&&input.edit.banner_media_id&&input.edit.banner_media_id!==before.edit.banner_media_id){
   const media=(await validateMediaIds(conn,[Number(input.edit.banner_media_id)],'lanjutan',mediaRoot))[0];
   if(!media||!['jpg','jpeg','png','webp','avif'].includes(String(media.format).toLowerCase()))throw new HttpError(400,'INVALID_MEDIA','Pilih gambar raster dari Halaman Lanjutan.');
  }
  if(columns.length)await write(conn,`UPDATE page_settings SET ${columns.map(field=>`${field.column}=?`).join(',')},updated_by=? WHERE id=?`,[...columns.map(field=>input.edit[field.key]),actorId,before.id]);
  for(const field of slotFields)await setSlot(conn,before.id,field.key,'text',input.edit[field.key]!,actorId);
  if(slots&&name==='products'){
   if(input.edit.banner_mode!==before.edit.banner_mode)await setSlot(conn,before.id,'banner_mode','mode',input.edit.banner_mode!,actorId);
   if(input.edit.banner_media_id!==before.edit.banner_media_id)await setSlot(conn,before.id,'banner_media_id','media',input.edit.banner_media_id!,actorId);
  }
  if(changed.length||slots&&name==='products'&&(input.edit.banner_mode!==before.edit.banner_mode||input.edit.banner_media_id!==before.edit.banner_media_id)){
   await revision(conn,{entityType:`page_settings:${secondarySpecs[name].pageKey}`,entityId:before.id,snapshot:input.edit,actorId,summary:'Updated secondary page'});
   await audit(conn,{actorId,action:`secondary.${name}.update`,entityType:'page_settings',entityId:before.id,requestId,before:before.edit,after:input.edit});
  }
  return response(name,(await read(conn,name,slots)).edit,true,slots);
 });
}
