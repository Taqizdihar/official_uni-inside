import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,transaction,write,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {HttpError,parse} from '../utils/http';

export type SectionName='contact'|'achievements'|'news'|'services'|'products';
const specs={
  contact:{table:'contact_section_settings',key:'id',value:1,fields:{heading:10,description:50}},
  achievements:{table:'achievement_section_settings',key:'id',value:1,fields:{heading:12,description:65}},
  news:{table:'homepage_section_settings',key:'section_key',value:'news',fields:{heading:15,description:50,primary_cta_label:15,primary_cta_url:1000}},
  services:{table:'homepage_section_settings',key:'section_key',value:'services',fields:{heading:12,primary_cta_label:20,primary_cta_url:1000}},
  products:{table:'homepage_section_settings',key:'section_key',value:'products',fields:{description:50,primary_cta_label:20,primary_cta_url:1000}},
} as const;
export const sectionNames=Object.keys(specs) as SectionName[];
export const countCharacters=(value:string)=>Array.from(value).length;
export function validButtonDestination(value:string){
  if(!value||value!==value.trim()||/\s|\\/u.test(value)||Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||value.startsWith('//'))return false;
  if(value.startsWith('/'))return true;
  try{const url=new URL(value);return /^https:\/\//i.test(value)&&url.protocol==='https:'&&!url.username&&!url.password&&Boolean(url.hostname);}catch{return false;}
}
export function validateSection(name:SectionName,input:Record<string,string>,old:Record<string,string>){
  const spec=specs[name],errors:{path:string;message:string}[]=[];
  for(const [field,max] of Object.entries(spec.fields)){
    const value=input[field];
    if(typeof value!=='string'||!value.trim())errors.push({path:field,message:'Kolom ini wajib diisi.'});
    else if(value!==old[field]){
      if(countCharacters(value)>max)errors.push({path:field,message:`Maksimal ${max} karakter.`});
      else if(field.endsWith('_url')&&!validButtonDestination(value))errors.push({path:field,message:'Gunakan path internal atau URL HTTPS yang aman.'});
      else if(!field.endsWith('_url')&&/[<>\r\n]/u.test(value))errors.push({path:field,message:'Gunakan teks biasa tanpa markup atau baris baru.'});
    }
  }
  return errors;
}
async function read(db:Executor,name:SectionName,lock=false){
  const spec=specs[name];
  const fields=Object.keys(spec.fields);
  const record=(await rows<RowDataPacket>(db,`SELECT ${fields.join(',')} FROM ${spec.table} WHERE ${spec.key}=?${lock?' FOR UPDATE':''}`,[spec.value]))[0];
  if(!record)throw new HttpError(503,'SECTION_INCOMPLETE','Pengaturan bagian Homepage belum tersedia.');
  return Object.fromEntries(fields.map(field=>[field,String(record[field]??'')])) as Record<string,string>;
}
export async function getSection(db:Executor,name:SectionName){return {edit:await read(db,name),capabilities:{contactSocialPlacements:false,contactCraftUrl:false,homepageNewsSelection:false,homepageNewsPopularity:false}};}
export async function saveSection(db:Pool,name:SectionName,body:unknown,actorId:number,requestId:string){
  const spec=specs[name],fields=Object.keys(spec.fields);
  const input=parse(z.strictObject(Object.fromEntries(fields.map(field=>[field,z.string()])) as Record<string,z.ZodString>),body) as Record<string,string>;
  return transaction(db,async conn=>{
    const before=await read(conn,name,true),errors=validateSection(name,input,before);
    if(errors.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai dan coba lagi.',errors);
    const changed=fields.filter(field=>input[field]!==before[field]);
    if(!changed.length)return getSection(conn,name);
    await write(conn,`UPDATE ${spec.table} SET ${changed.map(field=>`${field}=?`).join(',')},updated_by=? WHERE ${spec.key}=?`,[...changed.map(field=>input[field]),actorId,spec.value]);
    await revision(conn,{entityType:`${spec.table}:${spec.value}`,entityId:typeof spec.value==='number'?spec.value:0,snapshot:input,actorId,summary:'Updated Homepage section'});
    await audit(conn,{actorId,action:`homepage.${name}.update`,entityType:`${spec.table}:${spec.value}`,entityId:typeof spec.value==='number'?spec.value:0,requestId,before,after:input});
    return getSection(conn,name);
  });
}
