import { describe,expect,it } from 'vitest';
import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { csrfToken } from '../src/middleware/auth';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),LOG_LEVEL:'silent'});
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
  it('returns liveness without a database and 503 readiness when unavailable',async()=>{
    expect((await request(app).get('/api/v1/health')).body.data.status).toBe('ok');
    const ready=await request(app).get('/api/v1/ready');expect(ready.status).toBe(503);expect(ready.body.error).toMatchObject({code:'NOT_READY',requestId:expect.any(String)});
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
    expect(denied.status).toBe(401);expect(denied.body.error.code).toBe('UNAUTHENTICATED');
  });
  it('reports Cloudinary as unavailable when unconfigured',async()=>{
    const raw='session-token';const csrf=csrfToken(config,raw);
    const result=await request(app).post('/api/v1/admin/media/sign-upload').set('Origin','http://localhost:3000').set('X-CSRF-Token',csrf).set('Cookie',[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`]).send({scope:'products',entity:'cube'});
    expect(result.status).toBe(503);expect(result.body.error.code).toBe('INTEGRATION_NOT_CONFIGURED');
  });
});
