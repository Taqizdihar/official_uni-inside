import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {loadConfig} from '../src/config/env';
import {directCreate} from '../src/services/auth';
import {verifyPassword} from '../src/utils/security';
const config=loadConfig({DB_HOST:'localhost',DB_NAME:'uni-inside',DB_USER:'root',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40)});
const ctx={actorId:7,actorRole:'super_admin',requestId:'request-1'};
function database(existing=false){
  const calls:{sql:string;values:unknown[]}[]=[];
  let committed=false,rolledBack=false;
  const conn={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
    calls.push({sql:options.sql,values});
    if(options.sql.includes('FROM users WHERE email='))return [existing?[{id:9,status:'invited'}]:[],[]];
    if(options.sql.includes('FROM roles WHERE code='))return [[{id:3,code:values[0]}],[]];
    if(options.sql.startsWith('INSERT INTO users'))return [{insertId:42},[]];
    return [{affectedRows:1},[]];
  }};
  return {db:{getConnection:async()=>conn} as unknown as Pool,calls,state:()=>({committed,rolledBack})};
}
describe('direct member creation',()=>{
  it('creates an active member, hashes credentials, and audits without plaintext',async()=>{
    const test=database();const result=await directCreate(test.db,config,{email:'NEW@EXAMPLE.COM',displayName:'New Member',role:'editor'},ctx);
    expect(result.user).toMatchObject({id:42,email:'new@example.com',status:'active',role:'editor'});
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(config.PASSWORD_MIN_LENGTH);
    const insert=test.calls.find(call=>call.sql.startsWith('INSERT INTO users'))!;
    const hash=String(insert.values[2]);expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash,result.temporaryPassword)).toBe(true);
    expect(test.calls.some(call=>call.sql.startsWith('INSERT IGNORE INTO user_profiles'))).toBe(true);
    const audit=test.calls.find(call=>call.sql.startsWith('INSERT INTO audit_logs'))!;
    expect(audit.values).toContain('users.direct_create');
    expect(JSON.stringify(audit.values)).not.toContain(result.temporaryPassword);
    expect(test.state()).toEqual({committed:true,rolledBack:false});
  });
  it('rejects other actors and existing invited accounts',async()=>{
    await expect(directCreate(database().db,config,{email:'x@example.com',displayName:'X',role:'viewer'},{...ctx,actorRole:'administrator'})).rejects.toMatchObject({status:403});
    const test=database(true);
    await expect(directCreate(test.db,config,{email:'old@example.com',displayName:'X',role:'viewer'},ctx)).rejects.toMatchObject({code:'USER_EXISTS'});
    expect(test.calls.some(call=>call.sql.startsWith('INSERT INTO users'))).toBe(false);
    expect(test.state()).toEqual({committed:false,rolledBack:true});
  });
});
