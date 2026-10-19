import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { resources,fixedKeyAllowed,slugify } from '../src/schemas/resources';
import { create,parseBody,publishProblems,update } from '../src/services/content';
import { contentWhere, countRecords, projectRelationList, publicList, publicNewsCategories } from '../src/repositories/content';

describe('CMS content rules',()=>{
  it('preserves the authoritative migration counts',()=>{
    const sql=readFileSync('migrations/001_initial_schema.sql','utf8');
    expect((sql.match(/CREATE TABLE IF NOT EXISTS/g)??[])).toHaveLength(52);
    expect((sql.match(/\('(?:super_admin|administrator|editor|author|viewer)'/g)??[]).length).toBeGreaterThanOrEqual(5);
    const permissions=sql.split('INSERT IGNORE INTO permissions (')[1]?.split('INSERT IGNORE INTO role_permissions')[0]??'';
    expect((permissions.match(/^\s{4}\('[a-z.]+', '[^']+',/gm)??[])).toHaveLength(51);
  });
  it('rejects implementation fields and fixed-slot mutations',()=>{
    expect(()=>parseBody(resources.products!,{name:'Cube',mesh_position:[0,1,2]})).toThrow();
    expect(()=>parseBody(resources['hero-trust-signals']!,{slot:4,label:'Oops'})).toThrow();
    expect(fixedKeyAllowed('hero-trust-signals','4')).toBe(false);
    expect(fixedKeyAllowed('hero-workspaces','extra')).toBe(false);
    expect(fixedKeyAllowed('hero-hotspots','../../secret')).toBe(false);
    expect(slugify('The Golden Cube!')).toBe('the-golden-cube');
    expect(parseBody(resources.news!,{body:'<script>alert(1)</script><p>Allowed</p>'}).body).toBe('<p>Allowed</p>');
    expect(()=>parseBody(resources.services!,{primary_cta_url:'javascript:alert(1)'})).toThrow();
    expect(parseBody(resources.services!,{primary_cta_url:'mailto:halo@example.com'}).primary_cta_url).toBe('mailto:halo@example.com');
  });
  it('keeps legacy service creation from saving a half-configured CTA',async()=>{
    const actor={id:7,permissions:new Set(['services.create'])};
    await expect(create({} as Pool,'services',{name:'Film',primary_cta_label:'Hubungi'},actor,'request')).rejects.toThrow('label dan URL');
  });
  it('validates the CTA pair when an existing service is edited',async()=>{
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string})=>{
      if(options.sql.includes('FROM `services`'))return [[{id:9,name:'Film',slug:'film',status:'draft',primary_cta_label:null,primary_cta_url:null}],[]];
      return [{affectedRows:1},[]];
    }};
    const db={getConnection:async()=>conn} as unknown as Pool;
    const actor={id:7,permissions:new Set(['services.update'])};
    await expect(update(db,'services','9',{primary_cta_label:'Hubungi'},actor,'request')).rejects.toThrow('label dan URL');
  });
  it('saves an existing fixed slot without changing its key or other fields',async()=>{
    const row={id:1,heading_line_1:'Old',heading_line_2:'Made tangible',updated_by:2};
    const queries:string[]=[];
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
      queries.push(options.sql);
      if(options.sql.includes('FROM `hero_settings`'))return [[{...row}],[]];
      if(options.sql.startsWith('UPDATE `hero_settings`')){row.heading_line_1=String(values[0]);row.updated_by=Number(values[1]);return [{affectedRows:1},[]];}
      if(options.sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
      return [{affectedRows:1},[]];
    }};
    const db={getConnection:async()=>conn} as unknown as Pool;
    const actor={id:7,permissions:new Set(['homepage.update'])};
    const saved=await update(db,'hero-settings','1',{heading_line_1:'New'},actor,'test-request');
    expect(saved).toMatchObject({id:1,heading_line_1:'New',heading_line_2:'Made tangible',updated_by:7});
    expect(queries.some(sql=>sql.includes('UPDATE `hero_settings`')&&sql.includes('WHERE `id`=?'))).toBe(true);
  });
  it('requires complete public content while allowing draft edits',()=>{
    expect(publishProblems('team-members',{full_name:'A',slug:'a',role_title:'Maker'})).toContain('photo');
    expect(publishProblems('products',{name:'Cube',slug:'cube',product_type:'ready_made',short_description:'A cube',category_id:1,cover_media_id:1,base_price:100},{purchaseLinks:0})).toContain('purchase/contact link');
    expect(publishProblems('services',{name:'Film',slug:'film',short_description:'Film',category_id:1,cover_media_id:1,primary_cta_url:'/contact'})).toEqual([]);
    expect(publishProblems('services',{name:'Film',slug:'film',short_description:'Film',category_id:1,cover_media_id:1})).toEqual([]);
    expect(publishProblems('projects',{title:'Project',slug:'project',short_description:'A project',cover_media_id:1})).toEqual([]);
    expect(publishProblems('news',{title:'Story',slug:'story',excerpt:'Excerpt',body:'Body',category_id:1,author_user_id:1,cover_media_id:1})).toEqual([]);
    expect(publishProblems('partners',{name:'Partner',slug:'partner',logo_media_id:1})).toEqual([]);
    expect(publishProblems('achievements',{title:'Award'})).toContain('date, year, or supporting description');
  });
  it('uses published and non-deleted predicates in public queries',async()=>{
    let query='';
    const db={execute:async(options:{sql:string})=>{query=options.sql;return [[],[]];}} as any;
    await publicList(db,resources.products!,10,0);
    expect(query).toContain("status IN ('published','scheduled')");expect(query).toContain('deleted_at IS NULL');
    await publicList(db,resources.partners!,10,0);
    expect(query).toContain("status='published'");
  });
  it('keeps collection filters tied to each resource schema and count query',async()=>{
    const spec=resources['product-images']!;
    expect(contentWhere(spec,{parentId:12})).toEqual({sql:'WHERE `product_id`=?',values:[12]});
    expect(contentWhere(resources.products!,{search:'lamp',status:'draft',categoryId:3}).values).toEqual(['%lamp%','draft',3]);
    expect(contentWhere(resources.products!,{parentId:99}).values).toEqual([]);
    let sql='';let params:unknown[]=[];
    const db={execute:async(options:{sql:string},values:unknown[])=>{sql=options.sql;params=values;return [[{count:4}],[]];}} as any;
    expect(await countRecords(db,resources.products!,{categoryId:3,status:'draft'})).toBe(4);
    expect(sql).toContain('category_id=?');expect(sql).toContain('status=?');expect(params).toEqual(['draft',3]);
  });
  it('reads project relation labels through bounded database queries',async()=>{
    const queries:string[]=[];
    const db={execute:async(options:{sql:string})=>{queries.push(options.sql);return [[],[]];}} as any;
    await projectRelationList(db,7,'services');await projectRelationList(db,7,'team-members');
    expect(queries[0]).toContain('project_services');expect(queries[0]).toContain('s.name AS label');
    expect(queries[1]).toContain('project_team_members');expect(queries[1]).toContain('t.full_name AS label');
  });
  it('exposes only active topics represented by currently public news',async()=>{
    let query='';
    const db={execute:async(options:{sql:string})=>{query=options.sql;return [[{id:3,name:'Studio Notes',slug:'studio-notes'}],[]];}} as any;
    expect(await publicNewsCategories(db)).toEqual([{id:3,name:'Studio Notes',slug:'studio-notes'}]);
    expect(query).toContain('c.is_active=1');
    expect(query).toContain('n.deleted_at IS NULL');
    expect(query).toContain("n.status IN ('published','scheduled')");
    expect(query).toContain('n.scheduled_at <= UTC_TIMESTAMP(3)');
  });
});
