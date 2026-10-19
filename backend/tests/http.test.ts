import { describe,expect,it,vi } from 'vitest';
import { v2 as cloudinary } from 'cloudinary';
import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { csrfToken } from '../src/middleware/auth';
import { rootCertificates } from 'node:tls';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000,https://uni-inside.pages.dev',LOG_LEVEL:'silent'});
const db={
  query:async()=>{throw new Error('Database unavailable');},
  execute:async(options:{sql:string})=>{
    const sql=options.sql;
    if(sql.includes('FROM auth_sessions'))return [[{session_id:2,user_id:1,role_id:1,role_code:'super_admin',last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];
    if(sql.includes('FROM role_permissions'))return [[{code:'homepage.update'},{code:'products.view'},{code:'media.view'},{code:'media.upload'}],[]];
    if(sql.includes('INSERT IGNORE INTO analytics_events'))return [{affectedRows:0},[]];
    return [{affectedRows:1},[]];
  },
} as unknown as Pool;
describe('HTTP behavior',()=>{
  const app=createApp(config,db);
  it('returns active news topics and an exact page boundary for filtered published news',async()=>{
    const calls:{sql:string;params:unknown[]}[]=[];
    const publicDb={execute:async(options:{sql:string},params:unknown[]=[])=>{
      calls.push({sql:options.sql,params});
      if(options.sql.includes('FROM news_categories c'))return [[{id:7,name:'Studio Practice',slug:'studio-practice'}],[]];
      if(options.sql.includes('FROM `news_articles`'))return [[{id:3,slug:'third',title:'Third'},{id:2,slug:'second',title:'Second'}],[]];
      return [[],[]];
    }} as unknown as Pool;
    const publicApp=createApp(config,publicDb);
    const topics=await request(publicApp).get('/api/v1/news/categories');
    expect(topics.status).toBe(200);
    expect(topics.body.data).toEqual([{id:7,name:'Studio Practice',slug:'studio-practice'}]);
    const page=await request(publicApp).get('/api/v1/news?page=2&limit=1&categoryId=7');
    expect(page.status).toBe(200);
    expect(page.body.data).toEqual([{id:3,slug:'third',title:'Third'}]);
    expect(page.body.meta).toEqual({page:2,limit:1,hasMore:true});
    expect(calls.find(call=>call.sql.includes('FROM `news_articles`'))?.params).toEqual([7,2,1]);
  });
  it('returns liveness without a database and 503 readiness when unavailable',async()=>{
    const health=await request(app).get('/api/v1/health');expect(health.body.data.status).toBe('ok');expect(health.headers['cache-control']).toContain('no-store');
    const ready=await request(app).get('/api/v1/ready');expect(ready.status).toBe(503);expect(ready.headers['cache-control']).toContain('no-store');expect(ready.body.error).toMatchObject({code:'NOT_READY',requestId:expect.any(String)});
  });
  it('sets exact credentialed CORS and handles preflight without a wildcard',async()=>{
    const origin='https://uni-inside.pages.dev';
    const response=await request(app).get('/api/v1/site').set('Origin',origin);
    expect(response.headers['access-control-allow-origin']).toBe(origin);expect(response.headers['access-control-allow-credentials']).toBe('true');expect(response.headers.vary).toContain('Origin');
    const preflight=await request(app).options('/api/v1/auth/me').set('Origin',origin).set('Access-Control-Request-Method','POST').set('Access-Control-Request-Headers','content-type,x-csrf-token');
    expect(preflight.status).toBe(204);expect(preflight.headers['access-control-allow-origin']).toBe(origin);expect(preflight.headers['access-control-allow-credentials']).toBe('true');expect(preflight.headers['access-control-allow-methods']).toContain('OPTIONS');
  });
  it('blocks disallowed origins and does not leak stack traces',async()=>{
    const response=await request(app).post('/api/v1/auth/login').set('Origin','https://attacker.example').send({});
    expect(response.status).toBe(403);expect(response.body.error.code).toBe('ORIGIN_DENIED');expect(response.text).not.toContain('Error:');
  });
  it('requires CSRF and rejects create on fixed structures',async()=>{
    const raw='session-token';const csrf=csrfToken(config,raw);
    const base=request(app).post('/api/v1/admin/hero-trust-signals').set('Origin','http://localhost:3000').set('Cookie',[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`]);
    const denied=await base.send({label:'Fourth'});expect(denied.status).toBe(403);expect(denied.body.error.code).toBe('CSRF_INVALID');
    const fixed=await request(app).post('/api/v1/admin/hero-trust-signals').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`]).send({label:'Fourth'});
    expect(fixed.status).toBe(405);expect(fixed.body.error.code).toBe('METHOD_NOT_ALLOWED');
    const deleted=await request(app).delete('/api/v1/admin/hero-trust-signals/1').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`]);
    expect(deleted.status).toBe(405);
  });
  it('does not let an authenticated user without homepage.view open a fixed editor URL',async()=>{
    const denied=await request(app).get('/api/v1/admin/hero-settings/1').set('Cookie',`${config.SESSION_COOKIE_NAME}=session-token`);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });
  it('protects the composed product endpoint with CSRF and create permission',async()=>{
    const raw='session-token',csrf=csrfToken(config,raw),cookies=[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`];
    const noCsrf=await request(app).post('/api/v1/admin/products/compose').set('Origin','http://localhost:3000').set('Cookie',cookies).send({action:'draft',name:'Product'});
    expect(noCsrf.status).toBe(403);expect(noCsrf.body.error.code).toBe('CSRF_INVALID');
    const forbidden=await request(app).post('/api/v1/admin/products/compose').set('Origin','http://localhost:3000').set('Cookie',cookies).set('X-CSRF-Token',csrf).send({action:'draft',name:'Product'});
    expect(forbidden.status).toBe(403);expect(forbidden.body.error.code).toBe('FORBIDDEN');
  });
  it('rejects invalid pagination and unsupported sort columns',async()=>{
    const cookie=`${config.SESSION_COOKIE_NAME}=session-token`;
    const limit=await request(app).get('/api/v1/admin/products?limit=101').set('Cookie',cookie);
    expect(limit.status).toBe(400);expect(limit.body.error.code).toBe('VALIDATION_ERROR');
    const sort=await request(app).get('/api/v1/admin/products?sort=password_hash').set('Cookie',cookie);
    expect(sort.status).toBe(400);
    const invalidParent=await request(app).get('/api/v1/admin/products?parentId=3').set('Cookie',cookie);
    expect(invalidParent.status).toBe(400);
    const invalidStatus=await request(app).get('/api/v1/admin/product-images?status=published').set('Cookie',cookie);
    expect(invalidStatus.status).toBe(400);
    const invalidType=await request(app).get('/api/v1/admin/products?productType=made_up').set('Cookie',cookie);
    expect(invalidType.status).toBe(400);
    const wrongResourceType=await request(app).get('/api/v1/admin/products?contentType=news').set('Cookie',cookie);
    expect(wrongResourceType.status).toBe(400);
    const badScope=await request(app).get('/api/v1/admin/media?scope=other').set('Cookie',cookie);
    expect(badScope.status).toBe(400);
  });
  it('applies permission and strict content-field checks',async()=>{
    const raw='session-token';const csrf=csrfToken(config,raw);const cookies=[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`];
    const users=await request(app).get('/api/v1/admin/users').set('Cookie',cookies);
    expect(users.status).toBe(403);expect(users.body.error.code).toBe('FORBIDDEN');
    const content=await request(app).patch('/api/v1/admin/hero-trust-signals/1').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',cookies).send({meshPosition:[0,1,2]});
    expect(content.status).toBe(400);expect(content.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('enforces the request-body size limit',async()=>{
    const result=await request(app).post('/api/v1/auth/login').set('Origin','http://localhost:3000').send({email:'a@example.com',password:'x'.repeat(70_000)});
    expect(result.status).toBe(413);expect(result.body.error.code).toBe('BODY_TOO_LARGE');
  });
  it('deduplicates analytics UUIDs without a database service',async()=>{
    const result=await request(app).post('/api/v1/analytics/events').set('Origin','http://localhost:3000').send({eventUuid:'03b8c029-7e80-414c-84d2-95bc349627f4',eventName:'page_view',pagePath:'/products'});
    expect(result.status).toBe(200);expect(result.body.data).toEqual({accepted:true,deduplicated:true});
  });
  it('rejects missing sessions without exposing user data',async()=>{
    const denied=await request(app).get('/api/v1/auth/me');
    expect(denied.status).toBe(401);expect(denied.headers['cache-control']).toContain('no-store');expect(denied.body.error.code).toBe('UNAUTHENTICATED');
  });
  it('clears both production cookies with matching cross-site attributes on logout',async()=>{
    const production=loadConfig({NODE_ENV:'production',HOST:'0.0.0.0',PUBLIC_FRONTEND_URL:'https://uni-inside.pages.dev',ADMIN_FRONTEND_URL:'https://uni-inside.pages.dev/admin',CORS_ALLOWED_ORIGINS:'https://uni-inside.pages.dev',TRUST_PROXY:'true',DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',DB_SSL_MODE:'required',DB_SSL_CA_BASE64:Buffer.from(rootCertificates[0]!).toString('base64'),DB_SSL_REJECT_UNAUTHORIZED:'true',SESSION_COOKIE_SECURE:'true',SESSION_COOKIE_SAME_SITE:'none',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),LOG_LEVEL:'silent'});
    const raw='session-token';const csrf=csrfToken(production,raw);
    const logoutDb={...db,getConnection:async()=>({beginTransaction:async()=>{},execute:db.execute,commit:async()=>{},rollback:async()=>{},release:()=>{}})} as unknown as Pool;
    const response=await request(createApp(production,logoutDb)).post('/api/v1/auth/logout').set('Origin','https://uni-inside.pages.dev').set('X-CSRF-Token',csrf).set('Cookie',[`${production.SESSION_COOKIE_NAME}=${raw}`,`${production.CSRF_COOKIE_NAME}=${csrf}`]).send({});
    expect(response.status).toBe(200);
    const cookies=response.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);
    if(!Array.isArray(cookies))throw new Error('Expected logout Set-Cookie headers');
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('Path=/');expect(cookies[0]).toContain('HttpOnly');expect(cookies[0]).toContain('Secure');expect(cookies[0]).toContain('SameSite=None');
    expect(cookies[1]).toContain('Path=/');expect(cookies[1]).toContain('Secure');expect(cookies[1]).toContain('SameSite=None');
    expect(cookies.every(cookie=>cookie.includes('Expires=Thu, 01 Jan 1970'))).toBe(true);
  });
  it('reports Cloudinary as unavailable when unconfigured',async()=>{
    const raw='session-token';const csrf=csrfToken(config,raw);
    const result=await request(app).post('/api/v1/admin/media/sign-upload').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`]).send({scope:'products',entity:'cube'});
    expect(result.status).toBe(503);expect(result.body.error.code).toBe('INTEGRATION_NOT_CONFIGURED');
  });
  it('requires media action permissions and blocks referenced assets before Cloudinary changes',async()=>{
    const raw='session-token',csrf=csrfToken(config,raw),cookies=[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`];
    const headers=(method:'patch'|'delete',path:string)=>request(app)[method](path).set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',cookies);
    for(const path of ['/api/v1/admin/media/7/rename','/api/v1/admin/media/7/move']){
      const denied=await headers('patch',path).send(path.endsWith('rename')?{name:'renamed'}:{folder:'uni-inside/team'});
      expect(denied.status).toBe(403);expect(denied.body.error.code).toBe('FORBIDDEN');
    }
    const deniedDelete=await headers('delete','/api/v1/admin/media/7');expect(deniedDelete.status).toBe(403);
    const protectedDb={...db,execute:async(options:{sql:string})=>{
      if(options.sql.includes('FROM role_permissions'))return [[{code:'media.view'},{code:'media.update'},{code:'media.delete'}],[]];
      if(options.sql.includes('SELECT DISTINCT folder_path'))return [[{folder_path:'uni-inside/team'}],[]];
      return db.execute(options);
    },getConnection:async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string})=>{
      if(options.sql.includes('FROM media_assets WHERE id='))return [[{id:7,provider:'cloudinary',resource_type:'image',public_id:'uni-inside/site/photo',secure_url:'https://res.cloudinary.com/example/image/upload/photo.jpg',folder_path:'uni-inside/site',format:'jpg',deleted_at:null}],[]];
      if(options.sql.includes('SELECT SUM(count)'))return [[{count:1}],[]];
      return [[],[]];
    }})} as unknown as Pool;
    const protectedApp=createApp(config,protectedDb);
    const response=await request(protectedApp).delete('/api/v1/admin/media/7').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',cookies);
    expect(response.status).toBe(409);expect(response.body.error.code).toBe('MEDIA_REFERENCED');
    for(const [path,body] of [['rename',{name:'new-photo'}],['move',{folder:'uni-inside/team'}]] as const){
      const blocked=await request(protectedApp).patch(`/api/v1/admin/media/7/${path}`).set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',cookies).send(body);
      expect(blocked.status).toBe(409);expect(blocked.body.error.code).toBe('MEDIA_REFERENCED');
    }
  });
  it('updates the media record only after Cloudinary confirms deletion',async()=>{
    const configured=loadConfig({DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CLOUDINARY_CLOUD_NAME:'test-cloud',CLOUDINARY_API_KEY:'test-key',CLOUDINARY_API_SECRET:'test-secret',CORS_ALLOWED_ORIGINS:'http://localhost:3000',LOG_LEVEL:'silent'});
    const actions:string[]=[];let dbFail=false;
    const execute=async(options:{sql:string})=>{
      const sql=options.sql;
      if(sql.includes('FROM auth_sessions'))return [[{session_id:2,user_id:1,role_id:1,role_code:'super_admin',last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];
      if(sql.includes('FROM role_permissions'))return [[{code:'media.delete'}],[]];
      if(sql.includes('FROM media_assets WHERE id='))return [[{id:7,provider:'cloudinary',resource_type:'image',public_id:'uni-inside/site/photo',secure_url:'https://res.cloudinary.com/test-cloud/image/upload/v1/uni-inside/site/photo.jpg',folder_path:'uni-inside/site',format:'jpg',deleted_at:null}],[]];
      if(sql.includes('SELECT SUM(count)'))return [[{count:0}],[]];
      if(sql.includes('UPDATE media_assets')){actions.push('database');if(dbFail)throw new Error('Database unavailable');}
      return [{affectedRows:1},[]];
    };
    const mediaDb={execute,getConnection:async()=>({execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}})} as unknown as Pool;
    const mediaApp=createApp(configured,mediaDb);const csrf=csrfToken(configured,'session-token');
    const remove=vi.spyOn(cloudinary.api,'delete_resources').mockImplementation(async()=>{actions.push('cloudinary');return {deleted:{'uni-inside/site/photo':'deleted'}} as never;});
    try{
      const call=()=>request(mediaApp).delete('/api/v1/admin/media/7').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',[`${configured.SESSION_COOKIE_NAME}=session-token`,`${configured.CSRF_COOKIE_NAME}=${csrf}`]);
      const success=await call();expect(success.status).toBe(200);expect(success.body.data).toEqual({deleted:true,cloudinary:'deleted'});expect(actions).toEqual(['cloudinary','database']);
      actions.length=0;remove.mockRejectedValue(new Error('Cloudinary unavailable'));
      const failure=await call();expect(failure.status).toBe(502);expect(failure.body.error.code).toBe('CLOUDINARY_DELETE_FAILED');expect(actions).toEqual([]);
      actions.length=0;dbFail=true;remove.mockImplementation(async()=>{actions.push('cloudinary');return {deleted:{'uni-inside/site/photo':'deleted'}} as never;});
      const databaseFailure=await call();expect(databaseFailure.status).toBe(503);expect(databaseFailure.body.error.code).toBe('MEDIA_DATABASE_FAILED');expect(actions).toEqual(['cloudinary','database']);
    }finally{remove.mockRestore();}
  });
});
