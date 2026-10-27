import {createHash} from 'node:crypto';
import type {Pool,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {rows,transaction,write,type Executor} from '../database/pool';
import {audit,revision} from '../repositories/audit';
import {aboutPreviewDefaults,validateAboutPreview,type AboutPreview} from '../contracts/aboutTeam';
import {HttpError,parse} from '../utils/http';
import {v2TableReady} from './v2Schema';

const fields={highlight:'intro_highlight',ecosystemEyebrow:'ecosystem_eyebrow',ecosystemDescription:'ecosystem_description',visionEyebrow:'vision_mission_eyebrow',visionHeading:'vision_heading',visionDescription:'vision_description',missionHeading:'mission_heading',guidesEyebrow:'guides_eyebrow',clientsEyebrow:'clients_eyebrow',clientsHeading:'clients_heading',clientsDescription:'clients_description'} as const;
const version=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const str=z.string();
const request=z.strictObject({edit:z.strictObject({highlight:str,ecosystemEyebrow:str,ecosystemDescription:str,workspaceTags:z.strictObject({studio:z.array(str).max(5),craft:z.array(str).max(5)}),visionMission:z.strictObject({eyebrow:str,visionHeading:str,visionDescription:str,missionHeading:str,missionPoints:z.array(str).length(3)}),guidesEyebrow:str,clients:z.strictObject({eyebrow:str,heading:str,description:str,types:z.array(str).max(5)})}),expectedVersion:z.string().regex(/^[a-f0-9]{64}$/)});
export async function aboutEditorialReady(db:Executor,enabled=false){
 if(!enabled)return false;
 if(!await v2TableReady(db,'about_settings',['id',...Object.values(fields)]))return false;
 if(!await v2TableReady(db,'about_workspace_tags',['id','workspace_key','position','label'],{workspace_key:'about_workspaces'},[['workspace_key','position']]))return false;
 if(!await v2TableReady(db,'about_mission_points',['slot','about_settings_id','point_text'],{about_settings_id:'about_settings'},[['slot']]))return false;
 return v2TableReady(db,'about_collaborator_types',['id','about_settings_id','position','label'],{about_settings_id:'about_settings'},[['about_settings_id','position']]);
}
async function read(db:Executor,lock=false):Promise<AboutPreview>{
 const tail=lock?' FOR UPDATE':'';
 const settings=(await rows<RowDataPacket>(db,`SELECT ${Object.values(fields).join(',')} FROM about_settings WHERE id=1${tail}`))[0];
 const tags=await rows<RowDataPacket>(db,`SELECT workspace_key,label FROM about_workspace_tags ORDER BY workspace_key,position${tail}`);
 const points=await rows<RowDataPacket>(db,`SELECT slot,point_text FROM about_mission_points WHERE about_settings_id=1 ORDER BY slot${tail}`);
 const types=await rows<RowDataPacket>(db,`SELECT label FROM about_collaborator_types WHERE about_settings_id=1 ORDER BY position${tail}`);
 if(!settings||Object.values(fields).some(column=>settings[column]===null)||points.length!==3||points.some((point,index)=>Number(point.slot)!==index+1)||tags.some(tag=>!['studio','craft'].includes(String(tag.workspace_key))))throw new HttpError(503,'ABOUT_EDITORIAL_INCOMPLETE','Konten tambahan About Us belum lengkap.');
 const edit={highlight:String(settings.intro_highlight),ecosystemEyebrow:String(settings.ecosystem_eyebrow),ecosystemDescription:String(settings.ecosystem_description),workspaceTags:{studio:tags.filter(tag=>tag.workspace_key==='studio').map(tag=>String(tag.label)),craft:tags.filter(tag=>tag.workspace_key==='craft').map(tag=>String(tag.label))},visionMission:{eyebrow:String(settings.vision_mission_eyebrow),visionHeading:String(settings.vision_heading),visionDescription:String(settings.vision_description),missionHeading:String(settings.mission_heading),missionPoints:points.map(point=>String(point.point_text))},guidesEyebrow:String(settings.guides_eyebrow),clients:{eyebrow:String(settings.clients_eyebrow),heading:String(settings.clients_heading),description:String(settings.clients_description),types:types.map(item=>String(item.label))}};
 if(validateAboutPreview(edit).length)throw new HttpError(503,'ABOUT_EDITORIAL_INCOMPLETE','Konten tambahan About Us perlu ditinjau sebelum aktivasi.');
 return edit;
}
export async function getAboutEditorial(db:Executor,enabled=false){
 if(!enabled)return {enabled:false,reason:'FEATURE_DISABLED',edit:aboutPreviewDefaults,version:null};
 if(!await aboutEditorialReady(db,true))return {enabled:false,reason:'DATABASE_MIGRATION_PENDING',edit:aboutPreviewDefaults,version:null};
 try{const edit=await read(db);return {enabled:true,reason:null,edit,version:version(edit)};}catch(error){if(error instanceof HttpError&&error.code==='ABOUT_EDITORIAL_INCOMPLETE')return {enabled:false,reason:'REFERENCE_DATA_PENDING',edit:aboutPreviewDefaults,version:null};throw error;}
}
export async function saveAboutEditorial(db:Pool,body:unknown,actorId:number,requestId:string,enabled=false){
 if(!await aboutEditorialReady(db,enabled))throw new HttpError(503,'CAPABILITY_PENDING','Konten tambahan About Us belum siap.');
 const input=parse(request,body),issues=validateAboutPreview(input.edit);
 if(issues.length)throw new HttpError(400,'VALIDATION_ERROR','Periksa kolom About Us.',issues);
 return transaction(db,async conn=>{
  const before=await read(conn,true);
  if(version(before)!==input.expectedVersion)throw new HttpError(409,'CONTENT_CHANGED','Konten About Us telah berubah. Muat ulang.');
  const after=input.edit;
  if(version(before)!==version(after)){
   const scalar=[after.highlight,after.ecosystemEyebrow,after.ecosystemDescription,after.visionMission.eyebrow,after.visionMission.visionHeading,after.visionMission.visionDescription,after.visionMission.missionHeading,after.guidesEyebrow,after.clients.eyebrow,after.clients.heading,after.clients.description];
   await write(conn,`UPDATE about_settings SET ${Object.values(fields).map(column=>`${column}=?`).join(',')},updated_by=? WHERE id=1`,[...scalar,actorId]);
   await write(conn,'DELETE FROM about_workspace_tags');
   for(const key of ['studio','craft'] as const)for(const [index,label] of after.workspaceTags[key].entries())await write(conn,'INSERT INTO about_workspace_tags (workspace_key,position,label) VALUES (?,?,?)',[key,index+1,label]);
   for(const [index,point] of after.visionMission.missionPoints.entries())await write(conn,'UPDATE about_mission_points SET point_text=? WHERE about_settings_id=1 AND slot=?',[point,index+1]);
   await write(conn,'DELETE FROM about_collaborator_types WHERE about_settings_id=1');
   for(const [index,label] of after.clients.types.entries())await write(conn,'INSERT INTO about_collaborator_types (about_settings_id,position,label) VALUES (1,?,?)',[index+1,label]);
   await revision(conn,{entityType:'about_settings:1',entityId:1,snapshot:{editorial:after},actorId,summary:'Updated About Us editorial content'});
   await audit(conn,{actorId,action:'homepage.about.editorial.update',entityType:'about_settings:1',entityId:1,requestId,before,after});
  }
  const edit=await read(conn);return {enabled:true,edit,version:version(edit)};
 });
}
