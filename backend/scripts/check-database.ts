import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { createPool, rows } from '../src/database/pool';
import { migrationStatus, schemaCheck } from '../src/database/migrations';
import type { RowDataPacket } from 'mysql2/promise';

async function main(){const db=createPool(loadConfig());try{
  const info=(await rows<RowDataPacket>(db,'SELECT VERSION() AS version,DATABASE() AS database_name'))[0];
  const collation=await rows<RowDataPacket>(db,"SHOW COLLATION LIKE 'utf8mb4_0900_ai_ci'");
  const schema=await schemaCheck(db);const migration=await migrationStatus(db);
  const result={serverVersion:info?.version,database:info?.database_name,collationAvailable:collation.length>0,schema,migration001Applied:!!migration.find(m=>m.version==='001')?.applied};
  console.info(JSON.stringify(result,null,2));if(!result.collationAvailable||!result.schema.ready||!result.migration001Applied)process.exitCode=1;
}finally{await db.end();}}
main().catch(err=>{console.error(err instanceof Error?err.message:'Database check failed');process.exitCode=1;});
