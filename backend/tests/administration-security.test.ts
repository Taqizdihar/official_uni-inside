import {describe,expect,it} from 'vitest';
import request from 'supertest';
import type {Pool} from 'mysql2/promise';
import {createApp} from '../src/app';
import {loadConfig} from '../src/config/env';
import {csrfToken} from '../src/middleware/auth';
import {login,updateUser} from '../src/services/auth';
import {hashPassword,verifyPassword} from '../src/utils/security';
import {auditList} from '../src/repositories/analytics';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000',LOG_LEVEL:'silent'});
type TestDb={pool:Pool;calls:{sql:string;params:unknown[]}[];state:{committed:boolean;rolledBack:boolean;targetRole:string;targetStatus:string;targetHash:string}};
function testDb(role='super_admin',permissions=['users.view','users.update','users.invite'],targetRole='editor',targetStatus='active',failAudit=false):TestDb {
  const calls:{sql:string;params:unknown[]}[]=[];
  const state={committed:false,rolledBack:false,targetRole,targetStatus,targetHash:'old-hash'};
  const execute=async(options:{sql:string},params:unknown[]=[])=>{
    const sql=options.sql;calls.push({sql,params});
    if(sql.includes('FROM auth_sessions s'))return [[{session_id:4,user_id:1,role_id:1,role_code:role,last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];
    if(sql.includes('FROM role_permissions rp'))return [permissions.map(code=>({code})),[]];
    if(sql.includes('FROM audit_logs a LEFT JOIN'))return [[{id:9,actor_user_id:1,actor_name:'Ayu',action_code:'auth.login',entity_type:'users',entity_id:1,target_name:'Ayu',request_id:'req-12345678',created_at:'2026-10-22 00:00:00'}],[]];
    if(sql.includes('COUNT(*) AS total FROM audit_logs'))return [[{total:1}],[]];
    if(sql.includes('FROM users u JOIN roles r')&&sql.includes('FOR UPDATE'))return [[{id:Number(params[0]),role_code:state.targetRole,status:state.targetStatus,password_hash:targetStatus==='invited'?null:state.targetHash}],[]];
    if(sql.includes('SELECT id,code FROM roles'))return [[{id:3,code:params[0]}],[]];
    if(failAudit&&sql.startsWith('INSERT INTO audit_logs'))throw new Error('Audit write failed');
    if(sql.includes('SET password_hash='))state.targetHash=String(params[0]);
    return [{affectedRows:1},[]];
  };
  const pool={execute,getConnection:async()=>({execute,beginTransaction:async()=>{},commit:async()=>{state.committed=true;},rollback:async()=>{state.rolledBack=true;},release:()=>{}})} as unknown as Pool;
  return {pool,calls,state};
}
const raw='admin-session-token';
const csrf=csrfToken(config,raw);
const cookie=[`${config.SESSION_COOKIE_NAME}=${raw}`,`${config.CSRF_COOKIE_NAME}=${csrf}`];
const post=(app:ReturnType<typeof createApp>,target=2)=>request(app).post(`/api/v1/admin/users/${target}/reset-password`).set('Origin','http://localhost:3000').set('Cookie',cookie).set('X-CSRF-Token',csrf).send({newPassword:'SafeMemberPassword2026!'});
describe('administration authorization',()=>{
  it.each(['editor','author','viewer'])('%s cannot list users even with a users.view grant',async role=>{
    const test=testDb(role);const response=await request(createApp(config,test.pool)).get('/api/v1/admin/users').set('Cookie',cookie);
    expect(response.status).toBe(403);expect(response.body.error.code).toBe('FORBIDDEN');
  });
  it('gates every user and invitation operation by established administration role',async()=>{
    const test=testDb('editor');const app=createApp(config,test.pool);
    const routes:[string,string][]=[['get','/admin/users'],['get','/admin/users/2'],['patch','/admin/users/2'],['get','/admin/invitations'],['post','/admin/invitations'],['post','/admin/invitations/2/resend'],['post','/admin/invitations/2/revoke']];
    for(const [method,path] of routes){
      const response=await (method==='get'?request(app).get(`/api/v1${path}`):method==='patch'?request(app).patch(`/api/v1${path}`):request(app).post(`/api/v1${path}`)).set('Origin','http://localhost:3000').set('Cookie',cookie).set('X-CSRF-Token',csrf).send({});
      expect(response.status,method+' '+path).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });
  it.each(['super_admin','administrator'])('%s can list users with users.view',async role=>{
    const test=testDb(role);const response=await request(createApp(config,test.pool)).get('/api/v1/admin/users').set('Cookie',cookie);
    expect(response.status).toBe(200);
  });
  it.each(['administrator','editor','author','viewer'])('%s cannot reset passwords even with users.update',async role=>{
    const test=testDb(role);const response=await post(createApp(config,test.pool));
    expect(response.status).toBe(403);expect(test.calls.some(call=>call.sql.includes('SET password_hash='))).toBe(false);
  });
  it('requires authentication and CSRF for administrative reset',async()=>{
    const test=testDb();const app=createApp(config,test.pool);
    expect((await request(app).post('/api/v1/admin/users/2/reset-password').send({newPassword:'SafeMemberPassword2026!'})).status).toBe(401);
    const denied=await request(app).post('/api/v1/admin/users/2/reset-password').set('Origin','http://localhost:3000').set('Cookie',cookie).send({newPassword:'SafeMemberPassword2026!'});
    expect(denied.status).toBe(403);expect(denied.body.error.code).toBe('CSRF_INVALID');
  });
  it('resets only an eligible member and commits hashing, revocations, and a secret-free audit',async()=>{
    const test=testDb();const response=await post(createApp(config,test.pool));
    expect(response.status).toBe(200);expect(response.body).toEqual({data:{reset:true}});
    expect(test.state.committed).toBe(true);
    expect(await verifyPassword(test.state.targetHash,'SafeMemberPassword2026!')).toBe(true);
    expect(test.calls.some(call=>call.sql.includes('UPDATE auth_sessions SET revoked_at')&&call.params[0]===2)).toBe(true);
    expect(test.calls.some(call=>call.sql.includes('UPDATE password_reset_tokens SET used_at')&&call.params[0]===2)).toBe(true);
    const event=test.calls.find(call=>call.sql.startsWith('INSERT INTO audit_logs'));
    expect(event?.params.slice(0,4)).toEqual([1,'users.password.admin_reset','users',2]);
    expect(JSON.stringify(event)).not.toContain('SafeMemberPassword2026!');
    expect(JSON.stringify(event)).not.toContain(test.state.targetHash);
  });
  it.each([['self',1,'editor','active'],['super administrator',2,'super_admin','active'],['unaccepted invitation',2,'editor','invited']])('rejects %s targets',async (_label,target,targetRole,status)=>{
    const test=testDb('super_admin',['users.update'],targetRole,status);const response=await post(createApp(config,test.pool),target);
    expect(response.status).toBe(403);expect(test.state.committed).toBe(false);
    expect(test.calls.some(call=>call.sql.includes('SET password_hash='))).toBe(false);
  });
  it('rejects weak passwords and unexpected request fields',async()=>{
    const test=testDb();const app=createApp(config,test.pool);
    expect((await request(app).post('/api/v1/admin/users/2/reset-password').set('Origin','http://localhost:3000').set('Cookie',cookie).set('X-CSRF-Token',csrf).send({newPassword:'password123456'})).body.error.code).toBe('WEAK_PASSWORD');
    expect((await request(app).post('/api/v1/admin/users/2/reset-password').set('Origin','http://localhost:3000').set('Cookie',cookie).set('X-CSRF-Token',csrf).send({newPassword:'SafeMemberPassword2026!',email:'wrong@example.com'})).body.error.code).toBe('VALIDATION_ERROR');
  });
  it('limits reset attempts per authenticated actor',async()=>{
    const test=testDb();const app=createApp(config,test.pool);
    for(let index=0;index<5;index++){
      const response=await request(app).post('/api/v1/admin/users/2/reset-password').set('Origin','http://localhost:3000').set('Cookie',cookie).set('X-CSRF-Token',csrf).send({});
      expect(response.status).toBe(400);
    }
    const limited=await request(app).post('/api/v1/admin/users/2/reset-password').set('Origin','http://localhost:3000').set('Cookie',cookie).set('X-CSRF-Token',csrf).send({});
    expect(limited.status).toBe(429);
  });
  it('rolls back credential changes if the audit event cannot be written',async()=>{
    const test=testDb('super_admin',['users.update'],'editor','active',true);
    const response=await post(createApp(config,test.pool));
    expect(response.status).toBe(500);expect(test.state.committed).toBe(false);expect(test.state.rolledBack).toBe(true);
    expect(test.calls.some(call=>call.sql.includes('UPDATE auth_sessions SET revoked_at'))).toBe(true);
  });
  it('does not create a session from a password verified before an administrative reset',async()=>{
    const oldHash=await hashPassword('SafeMemberPassword2026!');const newerHash=await hashPassword('DifferentMemberPass2026!');
    const calls:string[]=[];
    const execute=async(options:{sql:string})=>{
      calls.push(options.sql);
      if(options.sql.includes('WHERE u.email=?'))return [[{id:2,email:'member@example.com',password_hash:oldHash,status:'active'}],[]];
      if(options.sql.includes('FOR UPDATE'))return [[{id:2,password_hash:newerHash,status:'active'}],[]];
      return [{affectedRows:1},[]];
    };
    const pool={execute,getConnection:async()=>({execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}})} as unknown as Pool;
    await expect(login(pool,config,'member@example.com','SafeMemberPassword2026!',{requestId:'request-123'})).rejects.toMatchObject({code:'INVALID_CREDENTIALS'});
    expect(calls.some(sql=>sql.startsWith('INSERT INTO auth_sessions'))).toBe(false);
  });
  it.each(['super_admin','administrator','editor','author','viewer'])('%s can read bounded audit list without audit.view',async role=>{
    const test=testDb(role,[]);const response=await request(createApp(config,test.pool)).get('/api/v1/admin/audit?page=1&limit=20').set('Cookie',cookie);
    expect(response.status).toBe(200);expect(response.body.data[0]).toMatchObject({actor_name:'Ayu',target_name:'Ayu',request_id:'req-12345678'});
    expect(response.body.data[0]).not.toHaveProperty('before_json');
  });
  it('uses a LEFT JOIN and bounded newest-first audit query',async()=>{
    const test=testDb();await auditList(test.pool,20,40);
    const sql=test.calls[0]!.sql;
    expect(sql).toContain('LEFT JOIN users u');expect(sql).toContain('ORDER BY a.id DESC LIMIT ? OFFSET ?');
    expect(test.calls[0]!.params).toEqual([20,40]);
    expect(sql).not.toContain('before_json');
  });
  it('rejects super administrator self-demotion and deactivation even with multiple admins',async()=>{
    for(const [role,status] of [['viewer','active'],['super_admin','disabled']] as const){
      const test=testDb();
      await expect(updateUser(test.pool,1,role,status,{actorId:1,actorRole:'super_admin',permissions:new Set(['roles.manage']),requestId:'request-123'})).rejects.toMatchObject({code:'SELF_ADMIN_CHANGE_FORBIDDEN'});
      expect(test.state.committed).toBe(false);
      expect(test.calls.some(call=>call.sql.startsWith('UPDATE users SET role_id'))).toBe(false);
    }
  });
  it('blocks administrator edits to super administrators and role escalation despite roles.manage',async()=>{
    for(const [targetRole,nextRole] of [['super_admin','super_admin'],['administrator','super_admin']] as const){
      const test=testDb('administrator',[],targetRole);
      await expect(updateUser(test.pool,2,nextRole,'active',{actorId:1,actorRole:'administrator',permissions:new Set(['roles.manage']),requestId:'request-123'})).rejects.toMatchObject({code:'FORBIDDEN'});
      expect(test.state.committed).toBe(false);
    }
  });
});
