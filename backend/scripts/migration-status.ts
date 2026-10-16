import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { createPool } from '../src/database/pool';
import { migrationStatus } from '../src/database/migrations';

async function main(){const db=createPool(loadConfig());try{for(const item of await migrationStatus(db))console.info(`${item.version} ${item.applied?'applied':'pending'} ${item.applied?.checksum && item.applied.checksum!==item.checksum?'CHECKSUM MISMATCH':''}`);}finally{await db.end();}}
main().catch(err=>{console.error(err instanceof Error?err.message:'Migration status failed');process.exitCode=1;});
