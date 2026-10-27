import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {getSecondaryPage,saveSecondaryPage,secondarySlotsReady} from '../src/services/secondaryPages';
import {secondaryFields,secondarySpecs,type SecondaryName} from '../src/contracts/secondaryPages';
import {publicSite} from '../src/repositories/content';

function fixture(withMediaForeignKey=true,withCheck=true,name:SecondaryName='products'){
 const page:Record<string,unknown>={id:5,heading:'Objects made',description:'Product text',primary_cta_label:'Contact',primary_cta_url:'/#contact-us',meta_title:'Private SEO'};
 const slots=new Map<string,{value_type:string;text_value:string|null;media_id:number|null}>(name==='products'?[['banner_mode',{value_type:'mode',text_value:'automatic',media_id:null}]]:[]);
 const pageKey=secondarySpecs[name].pageKey;
 const calls:string[]=[];
 const columns=['id','page_settings_id','slot_key','value_type','text_value','media_id','updated_by'].map(name=>({COLUMN_NAME:name,DATA_TYPE:['id','page_settings_id','media_id'].includes(name)?'bigint':name==='value_type'?'enum':'varchar',COLUMN_TYPE:name==='value_type'?"enum('text','media','mode')":'bigint unsigned',CHARACTER_MAXIMUM_LENGTH:name==='slot_key'?64:name==='text_value'?1000:null,IS_NULLABLE:['text_value','media_id'].includes(name)?'YES':'NO'}));
 const constraints=[{CONSTRAINT_TYPE:'PRIMARY KEY',COLUMN_NAME:'id'},{CONSTRAINT_TYPE:'FOREIGN KEY',COLUMN_NAME:'page_settings_id',REFERENCED_TABLE_NAME:'page_settings'},{CONSTRAINT_TYPE:'FOREIGN KEY',COLUMN_NAME:'updated_by',REFERENCED_TABLE_NAME:'users'},...(withMediaForeignKey?[{CONSTRAINT_TYPE:'FOREIGN KEY',COLUMN_NAME:'media_id',REFERENCED_TABLE_NAME:'media_assets'}]:[])];
 const execute=async({sql}:{sql:string},values:unknown[]=[])=>{
  calls.push(sql);
  if(sql.includes('information_schema.COLUMNS'))return [columns,[]];
  if(sql.includes('information_schema.KEY_COLUMN_USAGE'))return [constraints,[]];
  if(sql.includes('information_schema.STATISTICS'))return [[{columns_in_index:'page_settings_id,slot_key'}],[]];
  if(sql.includes('information_schema.CHECK_CONSTRAINTS'))return [withCheck?[{CHECK_CLAUSE:"(value_type='media' AND media_id IS NOT NULL AND text_value IS NULL) OR (value_type IN ('text','mode') AND text_value IS NOT NULL AND media_id IS NULL)"}]:[],[]];
  if(sql.includes('FROM site_settings'))return [[{site_name:'Uni-Inside'}],[]];
  if(sql.includes('FROM social_links'))return [[],[]];
  if(sql.includes('FROM page_settings ORDER BY'))return [[{page_key:pageKey,...page}],[]];
  if(sql.includes('FROM secondary_page_content_slots AS s JOIN'))return [[...slots.entries()].map(([slot_key,item])=>({page_key:pageKey,slot_key,...item,...(item.media_id===99?{secure_url:'https://images.example/banner.jpg',alt_text:'Banner'}:{})})),[]];
  if(sql.startsWith('DELETE FROM secondary_page_content_slots')){slots.delete('banner_media_id');return [{affectedRows:1},[]];}
  if(sql.includes('FROM page_settings'))return [[{...page}],[]];
  if(sql.includes('FROM secondary_page_content_slots'))return [[...slots.entries()].map(([slot_key,item])=>({slot_key,...item})),[]];
  if(sql.includes('FROM media_assets'))return [values.includes(99)?[{id:99,format:'jpg',secure_url:'https://images.example/banner.jpg',alt_text:'Banner'}]:[],[]];
  if(sql.startsWith('UPDATE page_settings')){page[sql.match(/SET ([a-z_]+)=/)?.[1]??'heading']=values[0];return [{affectedRows:1},[]];}
  if(sql.startsWith('INSERT INTO secondary_page_content_slots')){if(values[2]==='media'&&!values[4])throw new Error('CHECK constraint rejects NULL media_id');slots.set(String(values[1]),{value_type:String(values[2]),text_value:values[3] as string|null,media_id:values[4] as number|null});return [{affectedRows:1},[]];}
  if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
  return [{affectedRows:1},[]];
 };
 const conn={execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}};
 return {db:{execute,getConnection:async()=>conn} as unknown as Pool,slots,calls,page};
}

describe('V2 secondary slot activation',()=>{
 it('gates incomplete foreign-key schema before querying slots',async()=>{
  const f=fixture(false);expect(await secondarySlotsReady(f.db)).toBe(false);
  const data=await getSecondaryPage(f.db,'products',false,true);
  expect(data.capabilities.contentSlots).toBe(false);
  expect(data.capabilities.contentSlotsReason).toBe('DATABASE_MIGRATION_PENDING');
  expect(f.calls.some(sql=>sql.includes('FROM secondary_page_content_slots'))).toBe(false);
 });
 it('gates a table missing its typed-value CHECK constraint',async()=>{
  const f=fixture(true,false);
  expect(await secondarySlotsReady(f.db)).toBe(false);
  expect((await getSecondaryPage(f.db,'products',false,true)).capabilities.contentSlotsReason).toBe('DATABASE_MIGRATION_PENDING');
 });
 it('persists only approved changed slots with audit and keeps existing page metadata',async()=>{
  const f=fixture(),before=await getSecondaryPage(f.db,'products',false,true);
  expect(before.capabilities.contentSlots).toBe(true);
  expect(before.capabilities.contentSlotsReason).toBeNull();
  expect(before.edit.accent).toBe(secondarySpecs.products.panels[0]?.fields[1]?.fallback);
  const input={...before.edit,accent:'Built by hand',listing_heading:'The objects'};
  const after=await saveSecondaryPage(f.db,'products',{edit:input,expectedVersion:before.version},7,'req',false,true);
  expect(after.edit.accent).toBe('Built by hand');expect(after.edit.listing_heading).toBe('The objects');
  expect(f.slots.get('accent')?.text_value).toBe('Built by hand');
  expect(f.page.meta_title).toBe('Private SEO');
  expect(f.calls.some(sql=>sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  await expect(saveSecondaryPage(f.db,'products',{edit:{...after.edit,meta_title:'Bad'},expectedVersion:after.version},7,'req',false,true)).rejects.toMatchObject({status:400});
  await expect(saveSecondaryPage(f.db,'products',{edit:{...after.edit,banner_mode:'manual'},expectedVersion:after.version},7,'req',false,true)).rejects.toMatchObject({status:400});
 });
 it('creates missing text and media slots, reloads them, and projects the saved banner publicly',async()=>{
  const f=fixture();const before=await getSecondaryPage(f.db,'products',false,true);
  expect([...f.slots.keys()]).toEqual(['banner_mode']);
  const edit={...before.edit,accent:'Made in Bandung',banner_mode:'manual',banner_media_id:'99'};
  const saved=await saveSecondaryPage(f.db,'products',{edit,expectedVersion:before.version},7,'first',false,true);
  expect(saved.edit).toMatchObject({accent:'Made in Bandung',banner_mode:'manual',banner_media_id:'99'});
  expect(f.slots.get('accent')).toMatchObject({value_type:'text',text_value:'Made in Bandung',media_id:null});
  expect(f.slots.get('banner_media_id')).toMatchObject({value_type:'media',text_value:null,media_id:99});
  const count=f.slots.size;
  const changed=await saveSecondaryPage(f.db,'products',{edit:{...saved.edit,accent:'Still in Bandung'},expectedVersion:saved.version},7,'second',false,true);
  expect(f.slots.size).toBe(count);
  expect((await getSecondaryPage(f.db,'products',false,true)).edit.accent).toBe('Still in Bandung');
  const site=await publicSite(f.db,true,false);
  expect(site.pages[0]?.slots).toMatchObject({accent:'Still in Bandung',banner_mode:'manual'});
  expect(site.pages[0]?.banner_media).toMatchObject({id:99,secure_url:'https://images.example/banner.jpg'});
  await expect(saveSecondaryPage(f.db,'products',{edit:changed.edit,expectedVersion:before.version},7,'stale',false,true)).rejects.toMatchObject({status:409});
 });
 for(const name of ['services','news','media-kit'] as const)it(`creates the first ${name} text slot and projects it publicly`,async()=>{
  const f=fixture(true,true,name),before=await getSecondaryPage(f.db,name,false,true);
  const key=secondaryFields(name).find(field=>!field.column)!.key,value=`Approved ${name} text`;
  expect(f.slots.size).toBe(0);
  await saveSecondaryPage(f.db,name,{edit:{...before.edit,[key]:value},expectedVersion:before.version},7,'first',false,true);
  expect((await getSecondaryPage(f.db,name,false,true)).edit[key]).toBe(value);
  const site=await publicSite(f.db,true,false);
  expect(site.pages[0]?.slots?.[key]).toBe(value);
  expect(f.page.meta_title).toBe('Private SEO');
 });
 it('switches manual to automatic and clears a media reference without a NULL media row',async()=>{
  const f=fixture();const first=await getSecondaryPage(f.db,'products',false,true);
  const manual=await saveSecondaryPage(f.db,'products',{edit:{...first.edit,banner_mode:'manual',banner_media_id:'99'},expectedVersion:first.version},7,'manual',false,true);
  const automatic=await saveSecondaryPage(f.db,'products',{edit:{...manual.edit,banner_mode:'automatic'},expectedVersion:manual.version},7,'automatic',false,true);
  expect(automatic.edit.banner_mode).toBe('automatic');
  expect(f.slots.get('banner_media_id')?.media_id).toBe(99);
  const cleared=await saveSecondaryPage(f.db,'products',{edit:{...automatic.edit,banner_media_id:''},expectedVersion:automatic.version},7,'clear',false,true);
  expect(cleared.edit.banner_media_id).toBe('');
  expect(f.slots.has('banner_media_id')).toBe(false);
  expect(f.calls.some(sql=>sql.startsWith('INSERT INTO secondary_page_content_slots')&&sql.includes('media_id'))).toBe(true);
  expect(f.calls.some(sql=>sql.startsWith('DELETE FROM secondary_page_content_slots'))).toBe(true);
 });
 it('rejects missing, unsafe, and oversized media references before writing',async()=>{
  const f=fixture();const before=await getSecondaryPage(f.db,'products',false,true),writes=()=>f.calls.filter(sql=>sql.startsWith('INSERT INTO secondary_page_content_slots')).length;
  for(const id of ['100','9007199254740993'])await expect(saveSecondaryPage(f.db,'products',{edit:{...before.edit,banner_mode:'manual',banner_media_id:id},expectedVersion:before.version},7,'invalid',false,true)).rejects.toMatchObject({status:400});
  expect(writes()).toBe(0);
 });
 it('reports the flag as disabled independently from schema readiness',async()=>{
  const f=fixture();const result=await getSecondaryPage(f.db,'products',false,false);
  expect(result.capabilities).toMatchObject({contentSlots:false,contentSlotsReason:'FEATURE_DISABLED'});
  expect(f.calls.some(sql=>sql.includes('FROM secondary_page_content_slots'))).toBe(false);
 });
});
