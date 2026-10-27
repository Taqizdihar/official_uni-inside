import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {aboutEditorialReady,getAboutEditorial,saveAboutEditorial} from '../src/services/aboutEditorialV2';
import {aboutPreviewDefaults} from '../src/contracts/aboutTeam';
import {getHomepageNewsSelection,homepageNewsSchema,publicHomepageNews,saveHomepageNewsSelection} from '../src/services/homepageNewsSelection';
import {getContactPlacements,saveContactPlacements} from '../src/services/contactPlacements';
import {getFooterV2} from '../src/services/footerV2';
import {publicHomepageSettings} from '../src/repositories/content';

function fixture(){
 const calls:string[]=[];
 const execute=async({sql}:{sql:string},params:unknown[]=[])=>{
  calls.push(sql);
  if(sql.includes('information_schema.COLUMNS')){
   if(sql.includes("TABLE_NAME='homepage_news_settings'"))return [[{COLUMN_NAME:'selection_mode',COLUMN_TYPE:"enum('latest','manual','popular')"}],[]];
   const names:Record<string,string[]>={homepage_news_settings:['id','selection_mode'],homepage_news_article_placements:['id','news_article_id','position']};
   return [(names[String(params[0])]??[]).map(COLUMN_NAME=>({COLUMN_NAME})),[]];
  }
  if(sql.includes('information_schema.KEY_COLUMN_USAGE')){
   if(sql.includes("TABLE_NAME='homepage_news_article_placements'"))return [[{COLUMN_NAME:'news_article_id',REFERENCED_TABLE_NAME:'news_articles'}],[]];
   return [String(params[0])==='homepage_news_article_placements'?[{COLUMN_NAME:'news_article_id',REFERENCED_TABLE_NAME:'news_articles'}]:[],[]];
  }
  if(sql.includes('information_schema.TABLE_CONSTRAINTS'))return [[{CONSTRAINT_TYPE:'PRIMARY KEY'}],[]];
  if(sql.includes('information_schema.STATISTICS'))return [[{column_list:'news_article_id'},{column_list:'position'}],[]];
  if(sql.includes('FROM homepage_news_settings'))return [[{mode:'manual'}],[]];
  if(sql.includes('FROM homepage_news_article_placements'))return [[{article_id:7},{article_id:3}],[]];
  if(sql.includes('FROM news_articles'))return [[{id:7,title:'First',status:'published',published_at:null,cover_media_id:0},{id:3,title:'Second',status:'published',published_at:null,cover_media_id:0}],[]];
  return [[],[]];
 };
 const db={execute,getConnection:async()=>({execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}})} as unknown as Pool;
 return {db,calls};
}

describe('default-disabled V2 editors',()=>{
 it('does not query optional About, Contact, or Footer storage when disabled',async()=>{
  const f=fixture();
  expect(await getAboutEditorial(f.db,false)).toMatchObject({edit:aboutPreviewDefaults,reason:'FEATURE_DISABLED'});
  expect((await getContactPlacements(f.db,false)).enabled).toBe(false);
  expect((await getContactPlacements(f.db,false)).reason).toBe('FEATURE_DISABLED');
  expect((await getHomepageNewsSelection(f.db,false)).reason).toBe('FEATURE_DISABLED');
  expect(await getFooterV2(f.db,false)).toBeNull();
  expect(f.calls).toEqual([]);
 });
 it('requires all About editorial tables before exposing migrated text',async()=>{
  const f=fixture();
  expect(await aboutEditorialReady(f.db,true)).toBe(false);
  expect(await getAboutEditorial(f.db,true)).toMatchObject({enabled:false,reason:'DATABASE_MIGRATION_PENDING'});
  await expect(saveAboutEditorial(f.db,{edit:aboutPreviewDefaults,expectedVersion:'0'.repeat(64)},1,'request',true)).rejects.toMatchObject({status:503});
  expect(f.calls.some(sql=>sql.startsWith('UPDATE')||sql.startsWith('DELETE'))).toBe(false);
 });
 it('enables an unseeded About editor, creates mission points on first save, then publishes only saved copy',async()=>{
  const columns:Record<string,string[]>={
   about_settings:['id','intro_highlight','ecosystem_eyebrow','ecosystem_description','vision_mission_eyebrow','vision_heading','vision_description','mission_heading','guides_eyebrow','clients_eyebrow','clients_heading','clients_description'],
   about_workspace_tags:['id','workspace_key','position','label'],
   about_mission_points:['slot','about_settings_id','point_text'],
   about_collaborator_types:['id','about_settings_id','position','label'],
  };
  const scalars=columns.about_settings!.filter(name=>name!=='id');
  const settings=Object.fromEntries(columns.about_settings!.map(name=>[name,name==='id'?1:null])) as Record<string,unknown>;
  const points=new Map<number,string>(),tags:{workspace_key:string;position:number;label:string}[]=[],types:{position:number;label:string}[]=[];
  const execute=async({sql}:{sql:string},params:unknown[]=[])=>{
   const table=String(params[0]??'');
   if(sql.includes('information_schema.COLUMNS'))return [(columns[table]??[]).map(COLUMN_NAME=>({COLUMN_NAME})),[]];
   if(sql.includes('information_schema.TABLE_CONSTRAINTS'))return [[{CONSTRAINT_TYPE:'PRIMARY KEY'}],[]];
   if(sql.includes('information_schema.KEY_COLUMN_USAGE'))return [[{COLUMN_NAME:table==='about_workspace_tags'?'workspace_key':'about_settings_id',REFERENCED_TABLE_NAME:table==='about_workspace_tags'?'about_workspaces':'about_settings'}],[]];
   if(sql.includes('information_schema.STATISTICS'))return [[{column_list:table==='about_workspace_tags'?'workspace_key,position':table==='about_mission_points'?'slot':'about_settings_id,position'}],[]];
   if(sql.includes('FROM about_settings'))return [[settings],[]];
   if(sql.includes('FROM about_workspace_tags'))return [tags,[]];
   if(sql.includes('FROM about_mission_points'))return [[...points].map(([slot,point_text])=>({slot,point_text})),[]];
   if(sql.includes('FROM about_collaborator_types'))return [types,[]];
   if(sql.startsWith('UPDATE about_settings')){scalars.forEach((name,index)=>{settings[name]=params[index];});return [{affectedRows:1},[]];}
   if(sql.startsWith('DELETE FROM about_workspace_tags')){tags.length=0;return [{affectedRows:1},[]];}
   if(sql.startsWith('INSERT INTO about_workspace_tags')){tags.push({workspace_key:String(params[0]),position:Number(params[1]),label:String(params[2])});return [{affectedRows:1},[]];}
   if(sql.startsWith('INSERT INTO about_mission_points')){points.set(Number(params[0]),String(params[1]));return [{affectedRows:1},[]];}
   if(sql.startsWith('DELETE FROM about_collaborator_types')){types.length=0;return [{affectedRows:1},[]];}
   if(sql.startsWith('INSERT INTO about_collaborator_types')){types.push({position:Number(params[0]),label:String(params[1])});return [{affectedRows:1},[]];}
   if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
   return [[],[]];
  };
  const db={execute,getConnection:async()=>({execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}})} as unknown as Pool;
  expect(await aboutEditorialReady(db,true)).toBe(true);
  const before=await getAboutEditorial(db,true);
  expect(before).toMatchObject({enabled:true,initialized:false,reason:'REFERENCE_DATA_PENDING'});
  expect(before.edit.visionMission.missionPoints).toEqual(['','','']);
  expect((await publicHomepageSettings(db,false,false,true)).aboutEditorial.highlight).toBe(aboutPreviewDefaults.highlight);
  const approved={...aboutPreviewDefaults,highlight:'Approved new highlight'};
  const saved=await saveAboutEditorial(db,{edit:approved,expectedVersion:before.version},1,'first-save',true);
  expect(saved).toMatchObject({enabled:true,initialized:true,reason:null});
  expect([...points.keys()]).toEqual([1,2,3]);
  expect((await getAboutEditorial(db,true)).edit.highlight).toBe('Approved new highlight');
  expect((await publicHomepageSettings(db,false,false,true)).aboutEditorial.highlight).toBe('Approved new highlight');
 });
 it('rejects Contact mutations when placement structure has not been verified',async()=>{
  const f=fixture();
  await expect(saveContactPlacements(f.db,{socialLinkIds:[1],craftUrl:'',expectedVersion:'0'.repeat(64)},1,'request',true)).rejects.toMatchObject({status:503});
  expect(f.calls.some(sql=>sql.startsWith('UPDATE')||sql.startsWith('DELETE'))).toBe(false);
 });
});

describe('Homepage News selection',()=>{
 it('retains manual order in CMS and public projections and rejects stale edits',async()=>{
  const f=fixture();expect(await homepageNewsSchema(f.db)).toEqual({modeColumn:'selection_mode',articleColumn:'news_article_id'});
  const data=await getHomepageNewsSelection(f.db,true);
  expect(data.enabled).toBe(true);expect(data.articleIds).toEqual([7,3]);
  expect('selectedArticles' in data ? data.selectedArticles.map(item=>Number(item.id)) : []).toEqual([7,3]);
  expect(((await publicHomepageNews(f.db,true)) as unknown as {id:number}[]|null)?.map(item=>item.id)).toEqual([7,3]);
  await expect(saveHomepageNewsSelection(f.db,{mode:'manual',articleIds:[7],expectedVersion:'0'.repeat(64)},1,'request',true)).rejects.toMatchObject({status:409});
  await expect(saveHomepageNewsSelection(f.db,{mode:'popular',articleIds:[],expectedVersion:data.version},1,'request',true)).rejects.toMatchObject({status:400});
  expect(f.calls.some(sql=>sql.startsWith('UPDATE')||sql.startsWith('DELETE'))).toBe(false);
 });
});
