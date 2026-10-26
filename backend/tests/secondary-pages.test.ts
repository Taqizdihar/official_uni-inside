import {describe,it,expect} from 'vitest';
import request from 'supertest';
import type {Pool} from 'mysql2/promise';
import {secondaryNames,secondaryFields,supportedSecondaryFields,secondarySpecs,validateSecondaryValues,safeSecondaryDestination} from '../src/contracts/secondaryPages';
import {getSecondaryPage,saveSecondaryPage} from '../src/services/secondaryPages';
import {update} from '../src/services/content';
import {createApp} from '../src/app';
import {loadConfig} from '../src/config/env';
import {csrfToken} from '../src/middleware/auth';
const config=loadConfig({DB_HOST:'localhost',DB_NAME:'isolated',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),LOG_LEVEL:'silent'});
function fixture(fail=false,permissions=['settings.view','settings.update']){
 const state:Record<string,Record<string,unknown>>={};
 for(const [index,name] of secondaryNames.entries())state[secondarySpecs[name].pageKey]={id:index+1,...Object.fromEntries(supportedSecondaryFields(name).map(field=>[field.column,field.fallback]))};
 const calls:{sql:string;values:unknown[]}[]=[];let before=structuredClone(state);
 const execute=async(options:{sql:string},values:unknown[]=[])=>{
  const sql=options.sql;calls.push({sql,values});
  if(sql.includes('FROM auth_sessions'))return [[{session_id:2,user_id:7,role_id:2,role_code:'administrator',last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];
  if(sql.includes('FROM role_permissions'))return [permissions.map(code=>({code})),[]];
  if(sql.startsWith('UPDATE auth_sessions'))return [{affectedRows:1},[]];
  if(sql.startsWith('SELECT ')&&sql.includes('FROM page_settings'))return [[state[String(values[0]??'projects')]],[]];
  if(sql.startsWith('UPDATE page_settings')){const columns=sql.split(' SET ')[1]!.split(',updated_by')[0]!.split(',').map(item=>item.split('=')[0]!);const key=Object.keys(state).find(item=>state[item]?.id===values.at(-1))!;columns.forEach((column,index)=>{state[key]![column]=values[index];});}
  else if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
  else if(sql.startsWith('INSERT INTO audit_logs')){if(fail)throw new Error('Logging failed');}
  else if(!sql.startsWith('INSERT INTO content_revisions'))throw new Error(sql);
  return [{affectedRows:1},[]];
 };
 const conn={execute,beginTransaction:async()=>{before=structuredClone(state);},commit:async()=>{calls.push({sql:'COMMIT',values:[]});},rollback:async()=>{for(const key of Object.keys(state))state[key]=before[key]!;calls.push({sql:'ROLLBACK',values:[]});},release:()=>{}};
 return {db:{execute,getConnection:async()=>conn} as unknown as Pool,calls,state};
}
describe('Secondary page fixed contracts',()=>{
 it('enforces every supported and pending field boundary with Unicode counting',()=>{
  for(const name of secondaryNames){const values=Object.fromEntries(secondaryFields(name).map(field=>[field.key,field.fallback]));for(const field of secondaryFields(name)){expect(validateSecondaryValues(name,{...values,[field.key]:''},{},false).filter(issue=>issue.path===field.key).length).toBe(field.optional?0:1);if(field.kind==='destination')continue;const at={...values,[field.key]:'😀'.repeat(field.limit)};expect(validateSecondaryValues(name,at,{},false).filter(issue=>issue.path===field.key)).toEqual([]);expect(validateSecondaryValues(name,{...at,[field.key]:'😀'.repeat(field.limit+1)}, {},false)).toContainEqual(expect.objectContaining({path:field.key}));}}
 });
 it('preserves unchanged legacy text and rejects restricted markup and unsafe destinations',()=>{
  const values={heading:'x'.repeat(60),description:'Description',cta_label:'Contact',cta_url:'/#contact-us'};expect(validateSecondaryValues('products',values,values)).toEqual([]);expect(validateSecondaryValues('products',{...values,heading:'<script>'},values)).toContainEqual(expect.objectContaining({path:'heading'}));
  for(const value of ['javascript:alert(1)','//evil.test','https://u:p@example.com','http://example.com','/bad\\path'])expect(safeSecondaryDestination(value)).toBe(false);
  for(const value of ['/#contact-us','/news','https://example.com/brief'])expect(safeSecondaryDestination(value)).toBe(true);
 });
 it('keeps fixed counts, targets, restricted identities and Media Kit persistence explicit',()=>{
  expect(secondarySpecs['media-kit'].panels).toHaveLength(7);expect(secondarySpecs.products.panels).toHaveLength(3);expect(secondarySpecs.news.panels).toHaveLength(2);
  expect(supportedSecondaryFields('media-kit').map(field=>field.key)).toEqual(['description']);expect(secondaryFields('services').find(field=>field.key==='scroll_label')?.fixedTarget).toBe('#studio-offerings');
  expect(secondaryFields('media-kit').filter(field=>/^capability_\d_heading$/.test(field.key))).toHaveLength(3);
 });
});
describe('Secondary persistence and gates',()=>{
 it('updates only approved existing columns and writes audit and revision atomically',async()=>{
  const f=fixture();f.state.products!.meta_title='Preserve existing metadata';const before=await getSecondaryPage(f.db,'products');const result=await saveSecondaryPage(f.db,'products',{edit:{...before.edit,heading:'New heading'},expectedVersion:before.version},7,'req');expect(result.edit.heading).toBe('New heading');expect(f.state.products!.meta_title).toBe('Preserve existing metadata');expect(f.calls.find(call=>call.sql.startsWith('UPDATE page_settings'))?.sql).toBe('UPDATE page_settings SET heading=?,updated_by=? WHERE id=?');expect(f.calls.some(call=>call.sql.startsWith('INSERT INTO audit_logs'))).toBe(true);expect(f.calls.some(call=>call.sql.startsWith('INSERT INTO content_revisions'))).toBe(true);expect(f.calls.at(-1)?.sql).toBe('COMMIT');
 });
 it('rejects pending and SEO properties, invalid values, and stale versions',async()=>{
  const f=fixture(),before=await getSecondaryPage(f.db,'products');
  for(const edit of [{...before.edit,accent:'Not stored'},{...before.edit,meta_title:'Hidden'},{...before.edit,heading:'x'.repeat(31)}])await expect(saveSecondaryPage(f.db,'products',{edit,expectedVersion:before.version},7,'req')).rejects.toMatchObject({status:400});
  await expect(saveSecondaryPage(f.db,'products',{edit:before.edit,expectedVersion:'0'.repeat(64)},7,'req')).rejects.toMatchObject({status:409});expect(f.calls.some(call=>call.sql.startsWith('UPDATE page_settings'))).toBe(false);
 });
 it('rolls back all content when logging fails',async()=>{
  const f=fixture(true),before=await getSecondaryPage(f.db,'products');await expect(saveSecondaryPage(f.db,'products',{edit:{...before.edit,heading:'Changed'},expectedVersion:before.version},7,'req')).rejects.toThrow('Logging failed');expect(f.state.products?.heading).toBe(before.edit.heading);expect(f.calls.at(-1)?.sql).toBe('ROLLBACK');
 });
 it('does not query missing slots or Projects rows while disabled',async()=>{
  const f=fixture();for(const name of secondaryNames)expect((await getSecondaryPage(f.db,name)).capabilities.contentSlots).toBe(false);expect((await getSecondaryPage(f.db,'projects')).enabled).toBe(false);await expect(saveSecondaryPage(f.db,'projects',{},7,'req')).rejects.toMatchObject({status:403});expect(f.calls.some(call=>call.values.includes('projects')||/slots|banner|translations/.test(call.sql))).toBe(false);
 });
 it('keeps a later Projects flag disabled until its singleton is ready',async()=>{
  const f=fixture();delete f.state.projects;expect((await getSecondaryPage(f.db,'projects',true)).enabled).toBe(false);await expect(saveSecondaryPage(f.db,'projects',{edit:{heading:'PROJECTS',description:''},expectedVersion:'a'.repeat(64)},7,'req',true)).rejects.toMatchObject({status:503});
 });
 it('blocks generic page-settings writes and restores, including Projects',async()=>{
  const f=fixture();for(const name of secondaryNames)await expect(update(f.db,'page-settings',secondarySpecs[name].pageKey,{meta_title:'Bypass'},{id:7,permissions:new Set(['settings.update'])},'req')).rejects.toMatchObject({status:409});expect(f.calls).toHaveLength(0);
 });
});
describe('Secondary HTTP boundaries',()=>{
 it('requires authentication, settings permission and CSRF',async()=>{
  const f=fixture(),app=createApp(config,f.db),cookie=`${config.SESSION_COOKIE_NAME}=session`;
  expect((await request(app).get('/api/v1/admin/secondary-pages/products')).status).toBe(401);
  expect((await request(app).get('/api/v1/admin/secondary-pages/products').set('Cookie',cookie)).status).toBe(200);
  expect((await request(app).patch('/api/v1/admin/secondary-pages/products').set('Cookie',cookie).send({})).status).toBe(403);
  expect((await request(createApp(config,fixture(false,[]).db)).get('/api/v1/admin/secondary-pages/products').set('Cookie',cookie)).status).toBe(403);
 });
 it('rejects arbitrary page keys and blocks Projects even for administrators',async()=>{
  const app=createApp(config,fixture().db),token=csrfToken(config,'session'),cookies=[`${config.SESSION_COOKIE_NAME}=session`,`${config.CSRF_COOKIE_NAME}=${token}`];
  expect((await request(app).get('/api/v1/admin/secondary-pages/arbitrary').set('Cookie',cookies)).status).toBe(400);
  expect((await request(app).patch('/api/v1/admin/secondary-pages/projects').set('Cookie',cookies).set('X-CSRF-Token',token).send({})).status).toBe(403);
 });
});
