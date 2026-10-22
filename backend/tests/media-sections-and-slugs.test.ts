import {describe,expect,it} from 'vitest';
import type {Executor} from '../src/database/pool';
import {resolveMediaDestination,sectionFolders,sectionOfFolder} from '../src/services/mediaSections';
import {slugCandidate,insertWithUniqueSlug} from '../src/services/uniqueSlug';
import {validateMediaIds} from '../src/services/mediaReferences';

describe('Bagian destination policy',()=>{
  it('resolves generic and contextual folders without a content slug',()=>{
    expect(resolveMediaDestination('postingan',undefined,'uni-inside')).toBe('uni-inside/postingan');
    expect(resolveMediaDestination('postingan','services','uni-inside')).toBe('uni-inside/services');
    expect(sectionFolders('postingan','uni-inside')).toEqual(['uni-inside/postingan','uni-inside/products','uni-inside/services','uni-inside/news']);
    expect(sectionOfFolder('uni-inside/services/legacy-article','uni-inside')).toBe('postingan');
    expect(()=>resolveMediaDestination('postingan','users','uni-inside')).toThrow();
    expect(()=>resolveMediaDestination('postingan',undefined,'../outside')).toThrow();
  });
  it('validates a media reference against generic and legacy folders',async()=>{
    const calls:{sql:string;values:unknown[]}[]=[];
    const db={execute:async(options:{sql:string},values:unknown[])=>{calls.push({sql:options.sql,values});return [[{id:9}],[]];}} as unknown as Executor;
    await expect(validateMediaIds(db,[9],'postingan','uni-inside')).resolves.toHaveLength(1);
    expect(calls[0]!.values).toContain('uni-inside/postingan/%');
    expect(calls[0]!.values).toContain('uni-inside/news/%');
    await expect(validateMediaIds(db,[9,10],'postingan','uni-inside')).rejects.toMatchObject({code:'INVALID_MEDIA'});
  });
});

describe('unique slugs',()=>{
  it('truncates safely before suffixing',()=>{
    expect(slugCandidate('a'.repeat(190),2)).toHaveLength(190);
    expect(slugCandidate('a'.repeat(190),2)).toMatch(/-2$/);
  });
  it('uses a suffix for existing rows and retries an insert race only on its slug index',async()=>{
    const attempted:string[]=[];
    const db={execute:async(_options:{sql:string},values:unknown[])=>[values[0]==='item'?[{id:1}]:[],[]]} as unknown as Executor;
    const result=await insertWithUniqueSlug(db,'products','item',async slug=>{attempted.push(slug);if(slug==='item-2')throw {code:'ER_DUP_ENTRY',sqlMessage:"Duplicate entry for key 'uq_products_slug'"};return slug;});
    expect(result).toBe('item-3');expect(attempted).toEqual(['item-2','item-3']);
    await expect(insertWithUniqueSlug(db,'products','item',async()=>{throw {code:'ER_DUP_ENTRY',sqlMessage:"Duplicate entry for key 'uq_products_category'"};})).rejects.toMatchObject({code:'ER_DUP_ENTRY'});
  });
});
