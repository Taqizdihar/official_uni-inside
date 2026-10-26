import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,write,transaction,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {HttpError,parse} from '../utils/http';
import {v2ColumnReady} from './v2Schema';
import {aboutPreviewDefaults,aboutTeamPendingCapabilities,canManageTemplate,initialCardTemplateUrl,safeExternalUrl,textIssues,validateAboutEdit,type AboutEdit,type PrincipleSlot} from '../contracts/aboutTeam';

const text=z.string();
export const aboutEditSchema=z.strictObject({
  intro:z.strictObject({subtitle:text,description:text}),
  ecosystem:z.strictObject({heading:text,workspaces:z.array(z.strictObject({key:z.enum(['studio','craft']),subtitle:text,description:text})).length(2)}),
  guides:z.strictObject({heading:text,principles:z.array(z.strictObject({slot:z.union([z.literal(1),z.literal(2),z.literal(3)]),heading:text,description:text})).length(3)}),
  partnersHeading:text,
});
const versionOf=(edit:unknown)=>createHash('sha256').update(JSON.stringify(edit)).digest('hex');
async function readAbout(db:Executor,lock=false):Promise<AboutEdit>{
  const tail=lock?' FOR UPDATE':'';
  const about=(await rows<RowDataPacket>(db,`SELECT lead_text,body_text,workspaces_heading,principles_heading FROM about_settings WHERE id=1${tail}`))[0];
  const workspaces=await rows<RowDataPacket>(db,`SELECT workspace_key,short_label,description FROM about_workspaces ORDER BY workspace_key${tail}`);
  const principles=await rows<RowDataPacket>(db,`SELECT slot,title,description FROM about_principles ORDER BY slot${tail}`);
  const partners=(await rows<RowDataPacket>(db,`SELECT heading FROM homepage_section_settings WHERE section_key='partners'${tail}`))[0];
  if(!about||!partners||workspaces.length!==2||!['studio','craft'].every(key=>workspaces.some(row=>row.workspace_key===key))||principles.length!==3||![1,2,3].every(slot=>principles.some(row=>Number(row.slot)===slot)))throw new HttpError(503,'ABOUT_INCOMPLETE','Slot konten About Us belum lengkap. Hubungi administrator.');
  return {
    intro:{subtitle:String(about.lead_text??''),description:String(about.body_text??'')},
    ecosystem:{heading:String(about.workspaces_heading??''),workspaces:(['studio','craft'] as const).map(key=>{const row=workspaces.find(item=>item.workspace_key===key)!;return {key,subtitle:String(row.short_label??''),description:String(row.description??'')};})},
    guides:{heading:String(about.principles_heading??''),principles:([1,2,3] as PrincipleSlot[]).map(slot=>{const row=principles.find(item=>Number(item.slot)===slot)!;return {slot,heading:String(row.title??''),description:String(row.description??'')};})},
    partnersHeading:String(partners.heading??''),
  };
}
export async function getAbout(db:Executor){const edit=await readAbout(db);return {edit,version:versionOf(edit),pending:aboutPreviewDefaults,capabilities:aboutTeamPendingCapabilities};}
export async function saveAbout(db:Pool,body:unknown,actorId:number,requestId:string){
  const input=parse(z.strictObject({edit:aboutEditSchema,expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)}),body);
  return transaction(db,async conn=>{
    const before=await readAbout(conn,true);
    if(input.expectedVersion!==versionOf(before))throw new HttpError(409,'CONTENT_CHANGED','Konten telah diperbarui oleh anggota lain. Muat ulang sebelum menyimpan.');
    const errors=validateAboutEdit(input.edit,before);
    if(errors.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom yang ditandai.',errors);
    const next=input.edit;
    const updates:[string,unknown[],boolean][]=[
      ['UPDATE about_settings SET lead_text=?,body_text=?,workspaces_heading=?,principles_heading=?,updated_by=? WHERE id=1',[next.intro.subtitle,next.intro.description,next.ecosystem.heading,next.guides.heading,actorId],JSON.stringify([before.intro,before.ecosystem.heading,before.guides.heading])!==JSON.stringify([next.intro,next.ecosystem.heading,next.guides.heading])],
      ...next.ecosystem.workspaces.map((item,index):[string,unknown[],boolean]=>['UPDATE about_workspaces SET short_label=?,description=?,updated_by=? WHERE workspace_key=?',[item.subtitle,item.description,actorId,item.key],JSON.stringify(item)!==JSON.stringify(before.ecosystem.workspaces[index])]),
      ...next.guides.principles.map((item,index):[string,unknown[],boolean]=>['UPDATE about_principles SET title=?,description=?,updated_by=? WHERE slot=?',[item.heading,item.description,actorId,item.slot],JSON.stringify(item)!==JSON.stringify(before.guides.principles[index])]),
      ["UPDATE homepage_section_settings SET heading=?,updated_by=? WHERE section_key='partners'",[next.partnersHeading,actorId],next.partnersHeading!==before.partnersHeading],
    ];
    if(updates.some(([, ,changed])=>changed)){
      for(const [sql,values,changed] of updates)if(changed)await write(conn,sql,values);
      await revision(conn,{entityType:'about_settings:1',entityId:1,snapshot:next,actorId,summary:'Updated unified About Us content'});
      await audit(conn,{actorId,action:'homepage.about.update',entityType:'about_settings:1',entityId:1,requestId,before,after:next});
    }
    return getAbout(conn);
  });
}
async function readTeam(db:Executor,lock=false,template=false){
  const row=(await rows<RowDataPacket>(db,`SELECT heading${template?',card_template_url':''} FROM team_section_settings WHERE id=1${lock?' FOR UPDATE':''}`))[0];
  if(!row)throw new HttpError(503,'TEAM_INCOMPLETE','Pengaturan Our Team belum tersedia.');
  return {heading:String(row.heading??''),templateUrl:template?String(row.card_template_url??initialCardTemplateUrl):initialCardTemplateUrl};
}
export async function getTeam(db:Executor,roleCode:string,managedTeam:boolean,templateEnabled=false){const ready=templateEnabled&&await v2ColumnReady(db,'team_section_settings','card_template_url');const value=await readTeam(db,false,ready);const edit={heading:value.heading};return {edit,version:versionOf(edit),template:{url:value.templateUrl,enabled:ready,roleMayEdit:canManageTemplate(roleCode)},managedTeam};}
export async function saveTeam(db:Pool,body:unknown,actorId:number,roleCode:string,managedTeam:boolean,requestId:string,templateEnabled=false){
  const input=parse(z.strictObject({edit:z.strictObject({heading:text}),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)}),body);
  return transaction(db,async conn=>{
    const before=await readTeam(conn,true);
    if(input.expectedVersion!==versionOf({heading:before.heading}))throw new HttpError(409,'CONTENT_CHANGED','Konten telah diperbarui. Muat ulang sebelum menyimpan.');
    const errors=textIssues('heading',input.edit.heading,15,before.heading);
    if(errors.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa Heading.',errors);
    if(input.edit.heading!==before.heading){
      await write(conn,'UPDATE team_section_settings SET heading=?,updated_by=? WHERE id=1',[input.edit.heading,actorId]);
      await revision(conn,{entityType:'team_section_settings:1',entityId:1,snapshot:input.edit,actorId,summary:'Updated Our Team heading'});
      await audit(conn,{actorId,action:'homepage.team.update',entityType:'team_section_settings:1',entityId:1,requestId,before,after:input.edit});
    }
    return getTeam(conn,roleCode,managedTeam,templateEnabled);
  });
}
export async function updateTeamTemplate(db:Pool,body:unknown,actorId:number,roleCode:string,requestId:string,enabled=false) {
  if(!canManageTemplate(roleCode))throw new HttpError(403,'FORBIDDEN','Hanya Super Administrator dan Administrator yang dapat mengubah template.');
  const input=parse(z.strictObject({url:z.string().max(1000)}),body);
  if(!safeExternalUrl(input.url)||!['canva.com','canva.link'].some(host=>new URL(input.url).hostname===host||new URL(input.url).hostname.endsWith(`.${host}`)))throw new HttpError(400,'VALIDATION_ERROR','Gunakan URL template Canva HTTPS yang aman.');
  if(!enabled||!await v2ColumnReady(db,'team_section_settings','card_template_url'))throw new HttpError(503,'CAPABILITY_PENDING','Penyimpanan URL template belum diaktifkan. Tautan saat ini tetap digunakan.');
  return transaction(db,async conn=>{
    const before=(await rows<RowDataPacket>(conn,'SELECT card_template_url FROM team_section_settings WHERE id=1 FOR UPDATE'))[0];
    if(!before)throw new HttpError(503,'TEAM_INCOMPLETE','Pengaturan Our Team belum tersedia.');
    const current=String(before.card_template_url??initialCardTemplateUrl);
    if(current!==input.url){
      await write(conn,'UPDATE team_section_settings SET card_template_url=?,updated_by=? WHERE id=1',[input.url,actorId]);
      await revision(conn,{entityType:'team_section_settings:1',entityId:1,snapshot:{card_template_url:input.url},actorId,summary:'Updated team card template'});
      await audit(conn,{actorId,action:'homepage.team.template.update',entityType:'team_section_settings',entityId:1,requestId,before:{url:current},after:{url:input.url}});
    }
    return {url:input.url};
  });
}
export function protectedAboutTeamResource(name:string,key:string){return ['about-settings','about-workspaces','about-principles','team-section-settings'].includes(name)||name==='homepage-sections'&&key==='partners';}
