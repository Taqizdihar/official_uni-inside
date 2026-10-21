import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {resources,slugify} from '../src/schemas/resources';
import {create,parseBody,permissionFor,remove} from '../src/services/content';
import {categoryReferenceCount} from '../src/repositories/content';
import {errorHandler} from '../src/utils/http';

const categories=[
  ['product-categories','products','product_categories','products'],
  ['service-categories','services','service_categories','services'],
  ['news-categories','news','news_categories','news_articles'],
] as const;

describe('category management',()=>{
  it.each(categories)('validates %s and derives the existing permission scope', (resource,scope)=>{
    const spec=resources[resource]!;
    expect(()=>parseBody(spec,{name:'   '})).toThrow();
    expect(()=>parseBody(spec,{name:'x'.repeat(151)})).toThrow();
    expect(()=>parseBody(spec,{name:'Valid',description:'x'.repeat(1001)})).toThrow();
    expect(parseBody(spec,{name:'Valid',description:null})).toEqual({name:'Valid',description:null});
    expect(permissionFor(spec,'create')).toBe(`${scope}.create`);
    expect(permissionFor(spec,'delete')).toBe(`${scope}.archive`);
    expect(slugify('Desain Grafis!')).toBe('desain-grafis');
  });
  it.each(categories)('counts all non-deleted content for %s, regardless of status',async(_resource,_scope,_categoryTable,contentTable)=>{
    let sql='';
    const db={execute:async(options:{sql:string})=>{sql=options.sql;return [[{count:2}],[]];}} as any;
    expect(await categoryReferenceCount(db,contentTable,7)).toBe(2);
    expect(sql).toContain(`FROM \`${contentTable}\``);
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).not.toContain('status');
  });
  it.each(categories)('blocks %s deletion for draft or published references',async(resource,scope,categoryTable,contentTable)=>{
    const statements:string[]=[];
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string})=>{
      statements.push(options.sql);
      if(options.sql.includes(`FROM \`${categoryTable}\``))return [[{id:7,name:'Used',slug:'used'}],[]];
      if(options.sql.includes(`FROM \`${contentTable}\``))return [[{count:1}],[]];
      return [{affectedRows:1},[]];
    }};
    const db={getConnection:async()=>conn} as unknown as Pool;
    const actor={id:1,permissions:new Set([`${scope}.archive`])};
    await expect(remove(db,resource,'7',actor,'test')).rejects.toMatchObject({status:409,code:'CATEGORY_IN_USE'});
    expect(statements[0]).toContain('FOR UPDATE');
    expect(statements.some(sql=>sql.startsWith(`DELETE FROM \`${categoryTable}\``))).toBe(false);
    await expect(remove(db,resource,'7',{...actor,permissions:new Set<string>()},'test')).rejects.toMatchObject({status:403,code:'FORBIDDEN'});
  });
  it.each(categories)('deletes unused %s with its audit trail',async(resource,scope,categoryTable)=>{
    const statements:string[]=[];
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string})=>{
      statements.push(options.sql);
      if(options.sql.includes(`FROM \`${categoryTable}\``))return [[{id:7,name:'Unused',slug:'unused'}],[]];
      if(options.sql.includes('COUNT(*) AS count'))return [[{count:0}],[]];
      if(options.sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
      return [{affectedRows:1},[]];
    }};
    const db={getConnection:async()=>conn} as unknown as Pool;
    expect(await remove(db,resource,'7',{id:1,permissions:new Set([`${scope}.archive`])},'test')).toEqual({deleted:true});
    expect(statements.some(sql=>sql.startsWith(`DELETE FROM \`${categoryTable}\``))).toBe(true);
    expect(statements.some(sql=>sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  });
  it('creates a category with a generated slug and nullable description',async()=>{
    const values:unknown[][]=[];
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string},params:unknown[]=[])=>{
      if(options.sql.startsWith('INSERT INTO `product_categories`')){values.push(params);return [{insertId:7},[]];}
      if(options.sql.includes('FROM `product_categories`'))return [[{id:7,name:'Desain Grafis',slug:'desain-grafis',description:null}],[]];
      if(options.sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
      return [{affectedRows:1},[]];
    }};
    const result=await create({getConnection:async()=>conn} as unknown as Pool,'product-categories',{name:'Desain Grafis',description:null},{id:1,permissions:new Set(['products.create'])},'test');
    expect(result?.slug).toBe('desain-grafis');
    expect(values[0]).toContain('desain-grafis');
    expect(values[0]).toContain(null);
  });
  it('maps duplicate slugs to an explicit conflict response',()=>{
    let status=0;let body:any;
    const response={headersSent:false,status(value:number){status=value;return this;},json(value:unknown){body=value;}};
    errorHandler(Object.assign(new Error('duplicate'),{code:'ER_DUP_ENTRY'}),{} as any,response as any,()=>{});
    expect(status).toBe(409);
    expect(body.error.code).toBe('ALREADY_EXISTS');
  });
});
