import type { Pool, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import type { Config } from '../config/env';
import { rows, transaction, write, type Executor } from '../database/pool';
import { audit, revision } from '../repositories/audit';
import { HttpError, parse } from '../utils/http';

export const heroCallouts = [
  'studio_lighting','studio_camera','studio_microphone','studio_monitor','studio_drone',
  'craft_printer','craft_filament','craft_products','craft_painting','craft_monitor',
] as const;
const workspaceKeys = ['studio','craft'] as const;
const slots = [1,2,3] as const;
const text = z.string();
const optionalText = z.string().nullable();
export const heroEdit = z.strictObject({
  headingLine1:text,headingLine2:text,headingLine3:text.optional(),descriptionLine1:text,descriptionLine2:optionalText,
  trustSignals:z.array(z.strictObject({slot:z.number().int(),numericValue:z.number().int().min(0).max(4294967295),suffix:optionalText,label:text})).length(3),
  workspaces:z.array(z.strictObject({key:text,primaryLabel:text,primaryUrl:text,secondaryLabel:optionalText,secondaryUrl:optionalText})).length(2),
  callouts:z.array(z.strictObject({key:text,label:text})).length(10),
});
export type HeroEdit = z.infer<typeof heroEdit>;
export type HeroData = {edit:HeroEdit;headingLine3Enabled:boolean};
const length = (value:string) => Array.from(value).length;
const issue = (path:string,message:string) => ({path,message});
export function displayCallout(row:{numeric_value:number|null;numeric_suffix:string|null;label:string}):string {
  return row.numeric_value==null?row.label:`${row.numeric_value}${row.numeric_suffix??''} ${row.label}`;
}
export function splitCallout(value:string):{numericValue:number|null;numericSuffix:string|null;label:string} {
  const match=/^([0-9]+)([^\d\s]*) (.+)$/u.exec(value);
  if(match&&Number.isSafeInteger(Number(match[1]))&&Number(match[1])<=4294967295&&String(Number(match[1]))===match[1]&&length(match[2]??'')<=16){
    return {numericValue:Number(match[1]),numericSuffix:match[2]||null,label:match[3]!};
  }
  return {numericValue:null,numericSuffix:null,label:value};
}
const urlValid = (value:string) => {
  if (/\s|\\/u.test(value)||Array.from(value).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password && Boolean(url.hostname); } catch {return false;}
};
export async function heroThreeLineReady(db:Executor, config:Config):Promise<boolean> {
  if (!config.HERO_THREE_LINE_ENABLED) return false;
  const record=(await rows<RowDataPacket>(db,"SELECT COUNT(*) AS total FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hero_settings' AND column_name='heading_line_3'"))[0];
  if(Number(record?.total)!==1)return false;
  const heading=(await rows<RowDataPacket>(db,'SELECT heading_line_1,heading_line_3 FROM hero_settings WHERE id=1'))[0];
  return typeof heading?.heading_line_1==='string' && heading.heading_line_1.startsWith('Ideas') && length(heading.heading_line_1.slice(5))<=9 && typeof heading.heading_line_3==='string' && heading.heading_line_3.trim().length>0;
}
async function readHero(db:Executor, ready:boolean, lock=false):Promise<HeroData> {
  const suffix=lock?' FOR UPDATE':'';
  const [settings]=await rows<RowDataPacket>(db,`SELECT heading_line_1,heading_line_2,description_line_1,description_line_2${ready?',heading_line_3':''} FROM hero_settings WHERE id=1${suffix}`);
  const trust=await rows<RowDataPacket>(db,`SELECT slot,numeric_value,suffix,label FROM hero_trust_signals ORDER BY slot${suffix}`);
  const workspaces=await rows<RowDataPacket>(db,`SELECT workspace_key,primary_cta_label,primary_cta_url,secondary_cta_label,secondary_cta_url FROM hero_workspace_content ORDER BY workspace_key${suffix}`);
  const callouts=await rows<RowDataPacket>(db,`SELECT hotspot_key,label,numeric_value,numeric_suffix FROM hero_hotspot_content ORDER BY hotspot_key${suffix}`);
  if(!settings||trust.length!==3||workspaces.length!==2||callouts.length!==10||slots.some(slot=>!trust.some(row=>row.slot===slot))||workspaceKeys.some(key=>!workspaces.some(row=>row.workspace_key===key))||heroCallouts.some(key=>!callouts.some(row=>row.hotspot_key===key)))throw new HttpError(503,'HERO_INCOMPLETE','Data Hero belum lengkap. Hubungi administrator.');
  return {headingLine3Enabled:ready,edit:{
    headingLine1:String(settings.heading_line_1??''),headingLine2:String(settings.heading_line_2??''),...(ready?{headingLine3:String(settings.heading_line_3??'')}:{}),descriptionLine1:String(settings.description_line_1??''),descriptionLine2:settings.description_line_2??null,
    trustSignals:slots.map(slot=>{const row=trust.find(item=>item.slot===slot)!;return {slot,numericValue:Number(row.numeric_value),suffix:row.suffix??null,label:String(row.label??'')};}),
    workspaces:workspaceKeys.map(key=>{const row=workspaces.find(item=>item.workspace_key===key)!;return {key,primaryLabel:String(row.primary_cta_label??''),primaryUrl:String(row.primary_cta_url??''),secondaryLabel:row.secondary_cta_label??null,secondaryUrl:row.secondary_cta_url??null};}),
    callouts:heroCallouts.map(key=>({key,label:displayCallout(callouts.find(row=>row.hotspot_key===key)! as {numeric_value:number|null;numeric_suffix:string|null;label:string})})),
  }};
}
export async function getHero(db:Pool,config:Config){return readHero(db,await heroThreeLineReady(db,config));}
export function validateHeroEdit(next:HeroEdit,current:HeroEdit,ready:boolean) {
  const errors:{path:string;message:string}[]=[];
  const check=(path:string,value:string|null,old:string|null,max:number,required:boolean) => {
    if(required&&!value?.trim())errors.push(issue(path,'Kolom ini wajib diisi.'));
    else if(value===old)return;
    else if(value!=null&&length(value)>max)errors.push(issue(path,`Maksimal ${max} karakter.`));
    else if(value!=null&&/[<>\r\n]/u.test(value))errors.push(issue(path,'Gunakan teks biasa tanpa markup atau baris baru.'));
  };
  if(!next.headingLine1.startsWith('Ideas'))errors.push(issue('headingLine1','Judul baris 1 harus diawali dengan Ideas.'));
  else if(next.headingLine1!==current.headingLine1&&length(next.headingLine1.slice(5))>9)errors.push(issue('headingLine1','Maksimal 9 karakter setelah Ideas.'));
  else if(next.headingLine1!==current.headingLine1&&/[<>\r\n]/u.test(next.headingLine1))errors.push(issue('headingLine1','Gunakan teks biasa tanpa markup atau baris baru.'));
  check('headingLine2',next.headingLine2,current.headingLine2,18,true);
  if(ready)check('headingLine3',next.headingLine3??'',current.headingLine3??'',18,true);
  else if(next.headingLine3!==undefined)errors.push(issue('headingLine3','Baris 3 belum dapat disimpan sampai kolom database tersedia.'));
  check('descriptionLine1',next.descriptionLine1,current.descriptionLine1,50,true);
  check('descriptionLine2',next.descriptionLine2,current.descriptionLine2,50,false);
  if(next.trustSignals.map(item=>item.slot).join(',')!=='1,2,3')errors.push(issue('trustSignals','Slot Hero harus tetap 1, 2, 3.'));
  if(next.workspaces.map(item=>item.key).join(',')!=='studio,craft')errors.push(issue('workspaces','Workspace Hero harus tetap Studio dan Craft.'));
  if(next.callouts.map(item=>item.key).join(',')!==heroCallouts.join(','))errors.push(issue('callouts','Identitas callout tidak sesuai.'));
  if(errors.some(item=>['trustSignals','workspaces','callouts'].includes(item.path)))return errors;
  next.trustSignals.forEach((item,index)=>{
    const old=current.trustSignals[index]!;
    check(`trustSignals.${index}.label`,item.label,old.label,14,true);
    if(item.numericValue!==old.numericValue&&item.numericValue>9999999)errors.push(issue(`trustSignals.${index}.numericValue`,'Maksimal 9.999.999 untuk tampilan Hero.'));
    if(item.suffix!==old.suffix&&item.suffix!=null){if(length(item.suffix)>16)errors.push(issue(`trustSignals.${index}.suffix`,'Maksimal 16 karakter.'));else if(/[<>\r\n]/u.test(item.suffix))errors.push(issue(`trustSignals.${index}.suffix`,'Gunakan teks biasa.'));}
  });
  next.workspaces.forEach((item,index)=>{
    const old=current.workspaces[index]!;
    for(const field of ['primaryLabel','secondaryLabel'] as const)check(`workspaces.${index}.${field}`,item[field],old[field],25,field==='primaryLabel'||item.secondaryLabel!==null||item.secondaryUrl!==null);
    for(const field of ['primaryUrl','secondaryUrl'] as const){const value=item[field],previous=old[field];if(field==='primaryUrl'&&!value)errors.push(issue(`workspaces.${index}.${field}`,'URL wajib diisi.'));else if(value!==previous&&(!value||!urlValid(value)))errors.push(issue(`workspaces.${index}.${field}`,'Gunakan path internal /... atau URL HTTPS tanpa kredensial.'));else if(value!==previous&&value!=null&&length(value)>1000)errors.push(issue(`workspaces.${index}.${field}`,'Maksimal 1.000 karakter.'));}
    if((item.secondaryLabel===null)!==(item.secondaryUrl===null))errors.push(issue(`workspaces.${index}.secondaryLabel`,'Isi label dan URL tombol kedua bersama.'));
  });
  next.callouts.forEach((item,index)=>{
    const old=current.callouts[index]!;check(`callouts.${index}.label`,item.label,old.label,30,true);
  });
  return errors;
}
export async function saveHero(db:Pool,config:Config,body:unknown,actorId:number,requestId:string):Promise<HeroData>{
  const input=parse(heroEdit,body);
  const ready=await heroThreeLineReady(db,config);
  return transaction(db,async conn=>{
    const current=await readHero(conn,ready,true);
    const errors=validateHeroEdit(input,current.edit,ready);
    if(errors.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai dan coba lagi.',errors);
    if(JSON.stringify(input)===JSON.stringify(current.edit))return current;
    const changed=(field:keyof HeroEdit)=>JSON.stringify(input[field])!==JSON.stringify(current.edit[field]);
    if(changed('headingLine1')||changed('headingLine2')||changed('descriptionLine1')||changed('descriptionLine2')||(ready&&changed('headingLine3'))){
      const columns=['heading_line_1=?','heading_line_2=?','description_line_1=?','description_line_2=?'];const values:unknown[]=[input.headingLine1,input.headingLine2,input.descriptionLine1,input.descriptionLine2];
      if(ready){columns.push('heading_line_3=?');values.push(input.headingLine3);}
      values.push(actorId);await write(conn,`UPDATE hero_settings SET ${columns.join(',')},updated_by=? WHERE id=1`,values);
    }
    for(let index=0;index<3;index++){const item=input.trustSignals[index]!,old=current.edit.trustSignals[index]!;if(JSON.stringify(item)===JSON.stringify(old))continue;await write(conn,'UPDATE hero_trust_signals SET numeric_value=?,suffix=?,label=?,updated_by=? WHERE slot=?',[item.numericValue,item.suffix,item.label,actorId,item.slot]);}
    for(let index=0;index<2;index++){const item=input.workspaces[index]!,old=current.edit.workspaces[index]!;if(JSON.stringify(item)===JSON.stringify(old))continue;await write(conn,'UPDATE hero_workspace_content SET primary_cta_label=?,primary_cta_url=?,secondary_cta_label=?,secondary_cta_url=?,updated_by=? WHERE workspace_key=?',[item.primaryLabel,item.primaryUrl,item.secondaryLabel,item.secondaryUrl,actorId,item.key]);}
    for(let index=0;index<10;index++){const item=input.callouts[index]!,old=current.edit.callouts[index]!;if(item.label===old.label)continue;const parts=splitCallout(item.label);await write(conn,'UPDATE hero_hotspot_content SET label=?,numeric_value=?,numeric_suffix=?,updated_by=? WHERE hotspot_key=?',[parts.label,parts.numericValue,parts.numericSuffix,actorId,item.key]);}
    await revision(conn,{entityType:'hero-settings',entityId:1,snapshot:input,actorId,summary:'Updated Hero content'});
    await audit(conn,{actorId,action:'homepage.hero.update',entityType:'hero-settings',entityId:1,requestId,before:current.edit,after:input});
    return readHero(conn,ready);
  });
}
