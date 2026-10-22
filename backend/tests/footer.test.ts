import {describe,expect,it} from 'vitest';
import request from 'supertest';
import type {Pool} from 'mysql2/promise';
import {createApp} from '../src/app';
import {loadConfig} from '../src/config/env';
import {csrfToken} from '../src/middleware/auth';
import {footerSettingsSchema} from '../src/routes/footer';
import {footerMapsEmbedSchema,footerSocialPlacementsSchema} from '../src/schemas/footerFuture';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000',LOG_LEVEL:'silent'});
function fixture(updatePermission=true){
  const calls:{sql:string;values:unknown[]}[]=[];
  const record:Record<string,unknown>={id:1,site_name:'Uni-Inside',footer_description:'Old description',public_email:'old@example.com',public_phone:'+62 811-1111',address_text:'Old address',default_meta_title:'Keep SEO',whatsapp_number:'628111111'};
  const execute=async(options:{sql:string},values:unknown[]=[])=>{const sql=options.sql;calls.push({sql,values});
    if(sql.includes('FROM auth_sessions'))return [[{session_id:1,user_id:7,role_id:2,role_code:'editor',last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];
    if(sql.includes('FROM role_permissions'))return [[{code:'settings.view'},...(updatePermission?[{code:'settings.update'}]:[])],[]];
    if(sql.includes('FROM `site_settings`'))return [[{...record}],[]];
    if(sql.startsWith('UPDATE `site_settings`')){const keys=[...sql.matchAll(/`([a-z_]+)`=\?/g)].map(match=>match[1]!);keys.forEach((key,index)=>{record[key]=values[index];});return [{affectedRows:1},[]];}
    if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
    return [{affectedRows:1},[]];
  };
  const connection={execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}};
  return {db:{execute,getConnection:async()=>connection} as unknown as Pool,calls,record};
}
const cookies=()=>{const session='session',token=csrfToken(config,session);return {token,values:[`${config.SESSION_COOKIE_NAME}=${session}`,`${config.CSRF_COOKIE_NAME}=${token}`]};};
describe('Footer core settings',()=>{
  it('strictly validates the four approved fields',()=>{
    const valid={footer_description:'Description',public_email:'team@example.com',public_phone:'+62 812-3456',address_text:'Bandung'};
    expect(footerSettingsSchema.parse(valid)).toEqual(valid);
    expect(()=>footerSettingsSchema.parse({...valid,map_url:'https://www.google.com/maps/embed?pb=x'})).toThrow();
    expect(()=>footerSettingsSchema.parse({...valid,footer_description:'x'.repeat(1001)})).toThrow();
    expect(()=>footerSettingsSchema.parse({...valid,public_email:'bad'})).toThrow();
    expect(()=>footerSettingsSchema.parse({...valid,public_phone:'javascript:alert(1)'})).toThrow();
  });
  it('prepares strict future placement and map contracts without activating storage',()=>{
    expect(footerSocialPlacementsSchema.parse([{social_link_id:2,position:1},{social_link_id:3,position:2}])).toHaveLength(2);
    expect(()=>footerSocialPlacementsSchema.parse([{social_link_id:2,position:1},{social_link_id:2,position:2}])).toThrow();
    expect(()=>footerSocialPlacementsSchema.parse([{social_link_id:2,position:1},{social_link_id:3,position:1}])).toThrow();
    expect(()=>footerSocialPlacementsSchema.parse(Array.from({length:11},(_,i)=>({social_link_id:i+1,position:i+1})))).toThrow();
    expect(footerMapsEmbedSchema.parse('https://www.google.com/maps/embed?pb=test')).toContain('/maps/embed');
    expect(()=>footerMapsEmbedSchema.parse('https://evil.example/maps/embed?pb=test')).toThrow();
  });
  it('reads only core Footer settings and reports separate pending capabilities',async()=>{
    const f=fixture(),response=await request(createApp(config,f.db)).get('/api/v1/admin/footer').set('Cookie',cookies().values);
    expect(response.status).toBe(200);
    expect(response.body.data.settings).toEqual({footer_description:'Old description',public_email:'old@example.com',public_phone:'+62 811-1111',address_text:'Old address'});
    expect(response.body.data.capabilities).toMatchObject({footerBaseSettings:{enabled:true},footerSocialPlacements:{enabled:false},footerMapsEmbed:{enabled:false}});
    expect(f.calls.some(call=>call.sql.includes('social_platforms'))).toBe(false);
  });
  it('persists only four fields and preserves unrelated settings',async()=>{
    const f=fixture(),session=cookies();
    const input={footer_description:'New description',public_email:'team@example.com',public_phone:'+62 812-3456',address_text:'Bandung\nIndonesia'};
    const response=await request(createApp(config,f.db)).patch('/api/v1/admin/footer').set('Origin','http://localhost:3000').set('Cookie',session.values).set('X-CSRF-Token',session.token).send(input);
    expect(response.status).toBe(200);expect(response.body.data.settings).toEqual(input);
    expect(f.record.default_meta_title).toBe('Keep SEO');expect(f.record.whatsapp_number).toBe('628111111');
    const update=f.calls.find(call=>call.sql.startsWith('UPDATE `site_settings`'))!;
    expect(update.sql).toContain('`footer_description`=?');expect(update.sql).not.toContain('`default_meta_title`=?');
    expect(f.calls.some(call=>call.sql.includes('social_platforms')||call.sql.includes('footer_social'))).toBe(false);
  });
  it('requires session, CSRF, and update permission',async()=>{
    const f=fixture(false),app=createApp(config,f.db),session=cookies();
    expect((await request(app).get('/api/v1/admin/footer')).status).toBe(401);
    expect((await request(app).patch('/api/v1/admin/footer').set('Origin','http://localhost:3000').set('Cookie',session.values).send({})).status).toBe(403);
    expect((await request(app).patch('/api/v1/admin/footer').set('Origin','http://localhost:3000').set('Cookie',session.values).set('X-CSRF-Token',session.token).send({})).status).toBe(403);
    expect(f.calls.some(call=>call.sql.startsWith('UPDATE `site_settings`'))).toBe(false);
  });
  it('rejects pending placement and map fields before any database update',async()=>{
    const f=fixture(),session=cookies();
    const response=await request(createApp(config,f.db)).patch('/api/v1/admin/footer').set('Origin','http://localhost:3000').set('Cookie',session.values).set('X-CSRF-Token',session.token).send({footer_description:'Test',public_email:null,public_phone:null,address_text:null,map_embed_url:'https://www.google.com/maps/embed?pb=x',social_placements:[{social_link_id:1,position:1}]});
    expect(response.status).toBe(400);expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(f.calls.some(call=>call.sql.startsWith('UPDATE `site_settings`'))).toBe(false);
  });
});
