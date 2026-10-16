import 'dotenv/config';
import { createApp } from './app';
import { loadConfig } from './config/env';
import { createPool } from './database/pool';

async function main() {
  const config=loadConfig();const db=createPool(config);const app=createApp(config,db);
  const server=app.listen(config.PORT,config.HOST,()=>{ console.info(`CMS API listening on ${config.HOST}:${config.PORT}`); });
  let closing=false;
  const shutdown=async()=>{if(closing)return;closing=true;await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await db.end();};
  const onSignal=()=>{void shutdown().catch(error=>{console.error('Shutdown failed:',error instanceof Error?error.message:'unknown error');process.exitCode=1;});};
  process.on('SIGTERM',onSignal);process.on('SIGINT',onSignal);
}
main().catch(error=>{console.error('Backend startup failed:',error instanceof Error?error.message:'unknown error');process.exitCode=1;});
