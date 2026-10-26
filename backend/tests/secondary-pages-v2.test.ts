import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {getSecondaryPage,saveSecondaryPage,secondarySlotsReady} from '../src/services/secondaryPages';
import {secondarySpecs} from '../src/contracts/secondaryPages';

function fixture(withMediaForeignKey=true){
 const page:Record<string,unknown>={id:5,heading:'Objects made',description:'Product text',primary_cta_label:'Contact',primary_cta_url:'/#contact-us',meta_title:'Private SEO'};
 const slots=new Map<string,{value_type:string;text_value:string|null;media_id:number|null}>();
 const calls:string[]=[];
 const columns=['id','page_settings_id','slot_key','value_type','text_value','media_id','updated_by'].map(name=>({COLUMN_NAME:name,DATA_TYPE:['id','page_settings_id','media_id'].includes(name)?'bigint':name==='value_type'?'enum':'varchar',COLUMN_TYPE:name==='value_type'?"enum('text','media','mode')":'bigint unsigned',CHARACTER_MAXIMUM_LENGTH:name==='slot_key'?64:name==='text_value'?1000:null,IS_NULLABLE:['text_value','media_id'].includes(name)?'YES':'NO'}));
 const constraints=[{CONSTRAINT_TYPE:'PRIMARY KEY',COLUMN_NAME:'id'},{CONSTRAINT_TYPE:'FOREIGN KEY',COLUMN_NAME:'page_settings_id',REFERENCED_TABLE_NAME:'page_settings'},...(withMediaForeignKey?[{CONSTRAINT_TYPE:'FOREIGN KEY',COLUMN_NAME:'media_id',REFERENCED_TABLE_NAME:'media_assets'}]:[])];
 const execute=async({sql}:{sql:string},values:unknown[]=[])=>{
  calls.push(sql);
  if(sql.includes('information_schema.COLUMNS'))return [columns,[]];
  if(sql.includes('information_schema.KEY_COLUMN_USAGE'))return [constraints,[]];
  if(sql.includes('information_schema.STATISTICS'))return [[{columns_in_index:'page_settings_id,slot_key'}],[]];
  if(sql.includes('FROM page_settings'))return [[{...page}],[]];
  if(sql.includes('FROM secondary_page_content_slots'))return [[...slots.entries()].map(([slot_key,item])=>({slot_key,...item})),[]];
  if(sql.startsWith('UPDATE page_settings')){page[sql.match(/SET ([a-z_]+)=/)?.[1]??'heading']=values[0];return [{affectedRows:1},[]];}
  if(sql.startsWith('INSERT INTO secondary_page_content_slots')){slots.set(String(values[1]),{value_type:String(values[2]),text_value:values[3] as string|null,media_id:values[4] as number|null});return [{affectedRows:1},[]];}
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
  expect(f.calls.some(sql=>sql.includes('FROM secondary_page_content_slots'))).toBe(false);
 });
 it('persists only approved changed slots with audit and keeps existing page metadata',async()=>{
  const f=fixture(),before=await getSecondaryPage(f.db,'products',false,true);
  expect(before.capabilities.contentSlots).toBe(true);
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
});
