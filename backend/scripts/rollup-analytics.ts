import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { createPool, transaction } from '../src/database/pool';
import { rollup } from '../src/repositories/analytics';
async function main(){const config=loadConfig();const db=createPool(config);try{await transaction(db,conn=>rollup(conn,config.ANALYTICS_RETENTION_DAYS));console.info('Analytics rollup complete.');}finally{await db.end();}}
main().catch(err=>{console.error(err instanceof Error?err.message:'Rollup failed');process.exitCode=1;});
