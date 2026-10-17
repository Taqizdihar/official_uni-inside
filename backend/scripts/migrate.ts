import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { runMigrations } from '../src/database/migrations';

runMigrations(loadConfig()).then(count=>console.info(`Checked ${count} migration(s).`)).catch(err=>{console.error(err instanceof Error?err.message:'Migration failed');process.exitCode=1;});
