import {describe,expect,it} from 'vitest';
import request from 'supertest';
import type {Pool} from 'mysql2/promise';
import {createApp} from '../src/app';
import {loadConfig} from '../src/config/env';
import {csrfToken} from '../src/middleware/auth';
import {cmsCapabilities} from '../src/services/capabilities';
import {createAccount,deleteAccount,updateAccount} from '../src/services/socialMedia';
import {accountPatchSchema,accountUrl,completeLabel} from '../src/schemas/socialMedia';
import {productFormInput} from '../src/services/productCreate';
import {mediaReferenceCount} from '../src/repositories/media';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000',LOG_LEVEL:'silent'});
const actor={id:7,permissions:new Set(['settings.view','settings.update'])};
function fakePool(initial:Record<string,number>={instagram:0,tiktok:0}){
  const counts={...initial},calls:string[]=[];let next=100;
  const connection={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
    const sql=options.sql;calls.push(sql);
    if(sql.includes('FROM social_platforms WHERE platform_code=?'))return [[{id:values[0]==='tiktok'?2:1,platform_code:values[0],name:values[0],icon_key:values[0],sort_order:0}],[]];
    if(sql.includes('COUNT(*) AS total FROM social_links'))return [[{total:counts[Number(values[0])===2?'tiktok':'instagram']??0}],[]];
    if(sql.startsWith('INSERT INTO social_links')){const key=Number(values[0])===2?'tiktok':'instagram';counts[key]=(counts[key]??0)+1;return [{insertId:next++,affectedRows:1},[]];}
    if(sql.includes('FROM social_links a JOIN social_platforms p'))return [[{id:values[0],canonical_code:'instagram',label:'Instagram - Akun Utama',url:'https://www.instagram.com/uniinside.id/',is_active:1}],[]];
    if(sql.includes('information_schema.COLUMNS'))return [[{TABLE_NAME:'product_purchase_links'}],[]];
    if(sql.includes('FROM product_purchase_links WHERE social_link_id=?'))return [[{total:1}],[]];
    return [{affectedRows:1},[]];
  }};
  return {db:{getConnection:async()=>connection} as unknown as Pool,counts,calls};
}
describe('Social Media V2 preparation',()=>{
  it('defaults both capabilities off and does no V2 schema query',async()=>{
    expect(config.SOCIAL_MEDIA_V2_ENABLED).toBe(false);expect(config.PRODUCT_VARIANT_MEDIA_ENABLED).toBe(false);
    const calls:string[]=[];const db={execute:async(options:{sql:string})=>{calls.push(options.sql);return [[],[]];}} as unknown as Pool;
    expect(await cmsCapabilities(db,config)).toEqual({socialMediaV2:{enabled:false,reason:'FEATURE_DISABLED'},productVariantMedia:{enabled:false,reason:'FEATURE_DISABLED'}});
    expect(calls).toEqual([]);
  });
  it('requires actual schema even when an administrator enables a flag',async()=>{
    const db={execute:async()=>[[],[]]} as unknown as Pool;
    const result=await cmsCapabilities(db,{...config,SOCIAL_MEDIA_V2_ENABLED:true,PRODUCT_VARIANT_MEDIA_ENABLED:true});
    expect(result.socialMediaV2).toEqual({enabled:false,reason:'DATABASE_MIGRATION_PENDING'});
    expect(result.productVariantMedia.enabled).toBe(false);
  });
  it('enables V2 only when required schema, references, seeded platforms, and legacy mappings are complete',async()=>{
    const db={execute:async(options:{sql:string})=>{
      if(options.sql.includes('information_schema.COLUMNS'))return [[...['social_platforms.id','social_platforms.platform_code','social_platforms.name','social_platforms.icon_key','social_platforms.sort_order','social_links.platform_id','social_links.description','product_purchase_links.social_link_id','product_variants.media_id'].map(value=>({TABLE_NAME:value.split('.')[0],COLUMN_NAME:value.split('.')[1]}))],[]];
      if(options.sql.includes('information_schema.TABLE_CONSTRAINTS'))return [[...['fk_social_links_platform','fk_product_purchase_links_social_link','fk_product_variants_media'].map(CONSTRAINT_NAME=>({CONSTRAINT_NAME}))],[]];
      return [[{unmapped:0,supported_platforms:12}],[]];
    }} as unknown as Pool;
    const result=await cmsCapabilities(db,{...config,SOCIAL_MEDIA_V2_ENABLED:true,PRODUCT_VARIANT_MEDIA_ENABLED:true});
    expect(result.socialMediaV2.enabled).toBe(true);expect(result.productVariantMedia.enabled).toBe(true);
  });
  it('returns controlled unavailable responses without V2 SQL and enforces auth/CSRF',async()=>{
    const calls:string[]=[];
    const db={execute:async(options:{sql:string})=>{calls.push(options.sql);if(options.sql.includes('FROM auth_sessions'))return [[{session_id:1,user_id:7,role_id:2,role_code:'editor',last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];if(options.sql.includes('FROM role_permissions'))return [[{code:'settings.view'},{code:'settings.update'}],[]];return [[],[]];}} as unknown as Pool;
    const app=createApp(config,db),session='session',token=csrfToken(config,session),cookies=[`${config.SESSION_COOKIE_NAME}=${session}`,`${config.CSRF_COOKIE_NAME}=${token}`];
    expect((await request(app).get('/api/v1/admin/social-media/capabilities')).status).toBe(401);
    const caps=await request(app).get('/api/v1/admin/social-media/capabilities').set('Cookie',cookies);expect(caps.body.data.socialMediaV2.enabled).toBe(false);
    const list=await request(app).get('/api/v1/admin/social-media/accounts').set('Cookie',cookies);expect(list.status).toBe(503);expect(list.body.error.code).toBe('FEATURE_UNAVAILABLE');
    const csrf=await request(app).post('/api/v1/admin/social-media/accounts').set('Origin','http://localhost:3000').set('Cookie',cookies).send({});expect(csrf.status).toBe(403);expect(csrf.body.error.code).toBe('CSRF_INVALID');
    const write=await request(app).post('/api/v1/admin/social-media/accounts').set('Origin','http://localhost:3000').set('Cookie',cookies).set('X-CSRF-Token',token).send({});expect(write.status).toBe(503);
    expect(calls.some(sql=>sql.includes('social_platforms')||sql.includes('platform_id')||sql.includes('social_link_id'))).toBe(false);
  });
  it('denies Social Media mutation without settings.update even with a valid CSRF token',async()=>{
    const db={execute:async(options:{sql:string})=>{if(options.sql.includes('FROM auth_sessions'))return [[{session_id:1,user_id:7,role_id:2,role_code:'editor',last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];if(options.sql.includes('FROM role_permissions'))return [[{code:'settings.view'}],[]];return [[],[]];}} as unknown as Pool;
    const session='session',token=csrfToken(config,session);
    const result=await request(createApp(config,db)).post('/api/v1/admin/social-media/accounts').set('Origin','http://localhost:3000').set('X-CSRF-Token',token).set('Cookie',[`${config.SESSION_COOKIE_NAME}=${session}`,`${config.CSRF_COOKIE_NAME}=${token}`]).send({platform_code:'instagram',label_suffix:'Akun',url:'https://instagram.com/uniinside.id'});
    expect(result.status).toBe(403);expect(result.body.error.code).toBe('FORBIDDEN');
  });
  it('locks the parent before enforcing the fifth account and rejects a sixth',async()=>{
    const fake=fakePool({instagram:4,tiktok:0});
    await createAccount(fake.db,{platform_code:'instagram',label_suffix:'Akun Utama',url:'https://www.instagram.com/uniinside.id/'},actor,'request');
    expect(fake.counts.instagram).toBe(5);
    await expect(createAccount(fake.db,{platform_code:'instagram',label_suffix:'Kedua',url:'https://www.instagram.com/uniinside.id/'},actor,'request')).rejects.toMatchObject({code:'ACCOUNT_LIMIT'});
    await createAccount(fake.db,{platform_code:'tiktok',label_suffix:'Craft',url:'https://www.tiktok.com/@uniinside.craft'},actor,'request');
    expect(fake.counts.tiktok).toBe(1);
    expect(fake.calls.findIndex(sql=>sql.includes('FROM social_platforms WHERE platform_code=?')&&sql.includes('FOR UPDATE'))).toBeLessThan(fake.calls.findIndex(sql=>sql.includes('COUNT(*) AS total FROM social_links')));
  });
  it('blocks referenced deletion and deactivation',async()=>{
    const fake=fakePool();
    await expect(deleteAccount(fake.db,1,actor,'request')).rejects.toMatchObject({code:'ACCOUNT_REFERENCED'});
    await expect(updateAccount(fake.db,1,{is_active:false},actor,'request')).rejects.toMatchObject({code:'ACCOUNT_REFERENCED'});
  });
  it('validates immutable label prefix, description and safe platform URL',()=>{
    expect(accountPatchSchema.parse({label_suffix:'Baru'})).toEqual({label_suffix:'Baru'});
    expect(()=>accountPatchSchema.parse({description:'x'.repeat(1001)})).toThrow();
    expect(completeLabel('instagram','Akun Utama')).toBe('Instagram - Akun Utama');
    expect(()=>completeLabel('instagram','Instagram - Akun Utama')).toThrow();
    expect(()=>completeLabel('instagram','')).toThrow();
    expect(accountUrl('https://wa.me/628123456789','whatsapp')).toContain('wa.me/628123456789');
    for(const value of ['javascript:alert(1)','https://instagram.com.evil.test/u','https://user:pass@instagram.com/u','https://instagram.com/redirect?url=https://evil.test'])expect(()=>accountUrl(value,'instagram')).toThrow();
  });
  it('accepts legacy product inputs but gates WhatsApp references and variant media separately',()=>{
    const basic={action:'draft',name:'Lampu',description:'',currency_code:'IDR'};
    expect(productFormInput({...basic,platforms:[{platform:'whatsapp'}]}).platforms).toHaveLength(1);
    expect(()=>productFormInput({...basic,platforms:[{platform:'whatsapp',social_link_id:4}]})).toThrow();
    expect(()=>productFormInput({...basic,variants:[{name:'A',price:10,stock_quantity:1,is_active:true,media_id:3}]})).toThrow();
    const enabled={socialMediaV2:true,productVariantMedia:true};
    expect(productFormInput({...basic,platforms:[{platform:'whatsapp',social_link_id:4}]},enabled).platforms[0]?.social_link_id).toBe(4);
    expect(()=>productFormInput({...basic,platforms:[{platform:'whatsapp'}]},enabled)).toThrow();
    expect(productFormInput({...basic,variants:[{name:'A',price:10,stock_quantity:1,is_active:true,media_id:3}],base_price:10},enabled).variants[0]?.media_id).toBe(3);
  });
  it('guards variant media during Media Library removal only after its capability is ready',async()=>{
    const calls:string[]=[];const db={execute:async(options:{sql:string})=>{calls.push(options.sql);return [[{count:options.sql.includes('FROM product_variants WHERE media_id=')?1:0}],[]];}} as unknown as Pool;
    expect(await mediaReferenceCount(db,3,false)).toBe(0);
    expect(calls.some(sql=>sql.includes('FROM product_variants WHERE media_id='))).toBe(false);
    expect(await mediaReferenceCount(db,3,true)).toBe(1);
  });
});
