import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { loadConfig } from '../src/config/env';
import { createPool, transaction } from '../src/database/pool';
import * as repo from '../src/repositories/auth';
import { audit } from '../src/repositories/audit';
import { hashPassword, validatePassword } from '../src/utils/security';

const args=process.argv.slice(2);const option=(flag:string)=>args[args.indexOf(flag)+1];
async function main(){
  if(!args.includes('--password-stdin'))throw new Error('Use --email ADDRESS --name NAME --password-stdin and pipe the password through stdin.');
  const email=z.email().parse(option('--email')).toLowerCase();const name=z.string().min(1).max(150).parse(option('--name'));
  const password=readFileSync(0,'utf8').replace(/\r?\n$/,'');const config=loadConfig();validatePassword(password,config.PASSWORD_MIN_LENGTH);
  const hash=await hashPassword(password);const db=createPool(config);
  try{const result=await transaction(db,async conn=>{
    const role=await repo.findRole(conn,'super_admin');if(!role)throw new Error('Run migration 001 before creating an administrator.');
    if(await repo.countActiveSuperAdmins(conn))throw new Error('An active super administrator already exists.');
    const existing=await repo.findUserByEmail(conn,email);if(existing)throw new Error('The email is already registered.');
    const created=await repo.bootstrapUser(conn,email,name,Number(role.id),hash);const id=Number(created.insertId);
    await repo.createProfile(conn,id);await audit(conn,{actorId:id,action:'auth.bootstrap',entityType:'users',entityId:id,requestId:'cli-bootstrap'});
    return {id,email};
  });console.info(`Created super administrator ${result.email} (ID ${result.id}).`);}finally{await db.end();}
}
main().catch(err=>{console.error(err instanceof Error?err.message:'Bootstrap failed');process.exitCode=1;});
