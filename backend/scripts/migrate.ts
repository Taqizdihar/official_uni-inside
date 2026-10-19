import 'dotenv/config';
import { loadConfig } from '../src/config/env';
import { runMigrations } from '../src/database/migrations';

runMigrations(loadConfig()).then(count=>console.info(`Checked ${count} migration(s).`)).catch(()=>{console.error('Migration failed. Check the database connection and migration state without sharing connection details.');process.exitCode=1;});
