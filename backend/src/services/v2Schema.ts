import type {RowDataPacket} from 'mysql2/promise';
import {rows,type Executor} from '../database/pool';

/** A narrow structural preflight. Call before every optional V2 table query. */
export async function v2TableReady(db:Executor,table:string,columns:readonly string[],references:Readonly<Record<string,string>>={},uniqueKeys:readonly string[][]=[]):Promise<boolean>{
 const metadata=await rows<RowDataPacket>(db,'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[table]);
 const names=new Set(metadata.map(row=>String(row.COLUMN_NAME)));
 if(!columns.every(name=>names.has(name)))return false;
 const constraints=await rows<RowDataPacket>(db,'SELECT CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=?',[table]);
 if(!constraints.some(row=>row.CONSTRAINT_TYPE==='PRIMARY KEY'))return false;
 if(Object.keys(references).length){
  const keys=await rows<RowDataPacket>(db,'SELECT COLUMN_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND REFERENCED_TABLE_NAME IS NOT NULL',[table]);
  if(Object.entries(references).some(([column,target])=>!keys.some(row=>row.COLUMN_NAME===column&&row.REFERENCED_TABLE_NAME===target)))return false;
 }
 if(uniqueKeys.length){
  const indexes=await rows<RowDataPacket>(db,"SELECT INDEX_NAME,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS column_list FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND NON_UNIQUE=0 GROUP BY INDEX_NAME",[table]);
  const available=new Set(indexes.map(row=>String(row.column_list)));
  if(uniqueKeys.some(key=>!available.has(key.join(','))))return false;
 }
 return true;
}
export async function v2ColumnReady(db:Executor,table:string,column:string):Promise<boolean>{
 const found=await rows<RowDataPacket>(db,'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',[table,column]);
 return found.length===1;
}
