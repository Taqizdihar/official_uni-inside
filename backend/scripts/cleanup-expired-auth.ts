import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { createPool } from '../src/database/pool';
import { cleanupExpiredAuth } from '../src/repositories/auth';
async function main(){const db=createPool(loadConfig());try{console.info(await cleanupExpiredAuth(db));}finally{await db.end();}}
main().catch(err=>{console.error(err instanceof Error?err.message:'Cleanup failed');process.exitCode=1;});
