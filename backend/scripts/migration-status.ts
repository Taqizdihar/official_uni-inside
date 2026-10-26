import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { createPool } from '../src/database/pool';
import { migrationStatus,preparedMigrationStatus } from '../src/database/migrations';

async function main(){const db=createPool(loadConfig());try{for(const item of await migrationStatus(db))console.info(`${item.version} ${item.state}`);for(const item of await preparedMigrationStatus(db))console.info(`${item.version} ${item.state} (externally applied effects only; equivalence unverified)`);}finally{await db.end();}}
main().catch(()=>{console.error('Could not read migration status. Check the database connection without sharing connection details.');process.exitCode=1;});
