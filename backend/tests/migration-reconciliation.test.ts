import {describe,expect,it} from 'vitest';
import {classifyMigration,CURRENT_001_CHECKSUM,LEGACY_001_CHECKSUM,historicalSchemaCheck} from '../src/database/migrations';
import type {Pool} from 'mysql2/promise';

describe('migration checksum reconciliation',()=>{
  it('recognizes only the reviewed legacy 001 pair with compatible schema',()=>{
    expect(classifyMigration('001',CURRENT_001_CHECKSUM,LEGACY_001_CHECKSUM,true)).toBe('reconciled_legacy_checksum');
    expect(classifyMigration('001',CURRENT_001_CHECKSUM,LEGACY_001_CHECKSUM,false)).toBe('checksum_mismatch');
    expect(classifyMigration('001','changed source',LEGACY_001_CHECKSUM,true)).toBe('checksum_mismatch');
    expect(classifyMigration('002',CURRENT_001_CHECKSUM,LEGACY_001_CHECKSUM,true)).toBe('checksum_mismatch');
    expect(classifyMigration('001',CURRENT_001_CHECKSUM,'unknown hash',true)).toBe('checksum_mismatch');
    expect(classifyMigration('001',CURRENT_001_CHECKSUM,CURRENT_001_CHECKSUM,false)).toBe('applied');
    expect(classifyMigration('001',CURRENT_001_CHECKSUM,null,true)).toBe('pending');
  });
  it('fails historical compatibility when original CHECK constraints are missing',async()=>{
    const pool={
      query:async(sql:string)=>[[sql.includes('information_schema.TABLES')?[]:[]],[]],
      execute:async()=>[[{count:0}],[]],
    } as unknown as Pool;
    const result=await historicalSchemaCheck(pool);
    expect(result.historicalReady).toBe(false);
    expect(result.missingConstraints).toContain('chk_roles_is_system');
    expect(result.historicalConstraintCount).toBe(153);
  });
});
