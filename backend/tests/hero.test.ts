import {describe,expect,it} from 'vitest';
import {heroEdit,heroCallouts,validateHeroEdit,heroThreeLineReady,saveHero,type HeroEdit} from '../src/services/hero';
import {loadConfig} from '../src/config/env';
import type {Pool} from 'mysql2/promise';

const current:HeroEdit={headingLine2:'Stories Crafted.',descriptionLine1:'From visual storytelling to physical creation,',descriptionLine2:'every idea is shaped with purpose.',trustSignals:[1,2,3].map(slot=>({slot,numericValue:10,suffix:'+',label:'PROJECTS'})),workspaces:['studio','craft'].map(key=>({key,primaryLabel:'Explore Our Services',primaryUrl:'/services',secondaryLabel:'See Our Work',secondaryUrl:'/projects'})),callouts:heroCallouts.map(key=>({key,label:'READY-MADE & CUSTOM PRODUCTS'}))};
const copy=()=>structuredClone(current);
const validate=(next:HeroEdit,ready=false)=>validateHeroEdit(next,current,ready,{});
const config=loadConfig({DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000'});
describe('Hero editor contract',()=>{
  it('accepts the exact trust label limit and rejects the next character, including Unicode code points',()=>{
    const next=copy();next.trustSignals[0]!.label='ABCDEFGHIJKLMN';expect(validate(next)).toEqual([]);
    next.trustSignals[0]!.label+='O';expect(validate(next)).toContainEqual(expect.objectContaining({path:'trustSignals.0.label'}));
    next.trustSignals[0]!.label='😀'.repeat(14);expect(validate(next)).toEqual([]);
  });
  it('checks all text limits while preserving unchanged legacy values',()=>{
    const cases:[(edit:HeroEdit)=>void,string][]=[
      [v=>{v.headingLine2='x'.repeat(19);},'headingLine2'],
      [v=>{v.descriptionLine1='x'.repeat(51);},'descriptionLine1'],
      [v=>{v.descriptionLine2='x'.repeat(51);},'descriptionLine2'],
      [v=>{v.workspaces[0]!.primaryLabel='x'.repeat(26);},'workspaces.0.primaryLabel'],
      [v=>{v.callouts[0]!.label='x'.repeat(31);},'callouts.0.label'],
    ];
    for(const [change,path] of cases){const next=copy();change(next);expect(validate(next)).toContainEqual(expect.objectContaining({path}));}
    const legacy=copy();legacy.callouts[0]!.label='x'.repeat(40);
    expect(validateHeroEdit({...legacy,descriptionLine2:'Updated'},legacy,false,{})).toEqual([]);
  });
  it('rejects technical fields, unknown identities and unready third-line writes',()=>{
    expect(heroEdit.safeParse({...current,intro_enabled:0}).success).toBe(false);
    const slot=copy();slot.trustSignals[0]!.slot=4;expect(validate(slot)).toContainEqual(expect.objectContaining({path:'trustSignals'}));
    const workspace=copy();workspace.workspaces[0]!.key='other';expect(validate(workspace)).toContainEqual(expect.objectContaining({path:'workspaces'}));
    const callout=copy();callout.callouts[0]!.key='studio_fake';expect(validate(callout)).toContainEqual(expect.objectContaining({path:'callouts'}));
    const third=copy();third.headingLine3='A third line';expect(validate(third)).toContainEqual(expect.objectContaining({path:'headingLine3'}));
    const ready={...current,headingLine3:'Saved line'};expect(validateHeroEdit({...ready,headingLine3:'x'.repeat(19)},ready,true,{})).toContainEqual(expect.objectContaining({path:'headingLine3'}));
  });
  it('validates safe CTA destinations and secondary button pairs',()=>{
    for(const url of ['javascript:alert(1)','//example.com','http://example.com','https://name:password@example.com']){const next=copy();next.workspaces[0]!.primaryUrl=url;expect(validate(next)).toContainEqual(expect.objectContaining({path:'workspaces.0.primaryUrl'}));}
    const next=copy();next.workspaces[0]!.secondaryUrl=null;expect(validate(next)).toContainEqual(expect.objectContaining({path:'workspaces.0.secondaryLabel'}));
    next.workspaces[0]!.secondaryUrl='https://example.com';expect(validate(next)).toEqual([]);
  });
  it('does not query the missing third-line column when the gate is disabled',async()=>{
    const db={execute:()=>{throw new Error('Unexpected query');}} as unknown as Pool;
    expect(await heroThreeLineReady(db,config)).toBe(false);
  });
  it('checks the column and approved backfill when the gate is enabled',async()=>{
    const enabled={...config,HERO_THREE_LINE_ENABLED:true};let queries=0;
    const db={execute:async(options:{sql:string})=>{queries++;return options.sql.includes('information_schema')?[[{total:1}],[]]:[[{heading_line_1:'Ideas',heading_line_3:'Made tangible'}],[]];}} as unknown as Pool;
    expect(await heroThreeLineReady(db,enabled)).toBe(true);expect(queries).toBe(2);
  });
  it('saves one changed label with an audit and revision, preserving restricted hotspot metadata',async()=>{
    const statements:string[]=[];let label='READY-MADE & CUSTOM PRODUCTS';
    const conn={beginTransaction:async()=>{statements.push('BEGIN');},commit:async()=>{statements.push('COMMIT');},rollback:async()=>{statements.push('ROLLBACK');},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
      const sql=options.sql;statements.push(sql);
      if(sql.includes('FROM hero_settings'))return [[{heading_line_2:current.headingLine2,description_line_1:current.descriptionLine1,description_line_2:current.descriptionLine2}],[]];
      if(sql.includes('FROM hero_trust_signals'))return [current.trustSignals.map(item=>({slot:item.slot,numeric_value:item.numericValue,suffix:item.suffix,label:item.label})),[]];
      if(sql.includes('FROM hero_workspace_content'))return [current.workspaces.map(item=>({workspace_key:item.key,primary_cta_label:item.primaryLabel,primary_cta_url:item.primaryUrl,secondary_cta_label:item.secondaryLabel,secondary_cta_url:item.secondaryUrl})),[]];
      if(sql.includes('FROM hero_hotspot_content'))return [current.callouts.map(item=>({hotspot_key:item.key,label:item.key===heroCallouts[0]?label:item.label,numeric_value:10,numeric_suffix:'+'})),[]];
      if(sql.startsWith('UPDATE hero_hotspot_content'))label=String(values[0]);
      if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
      return [{affectedRows:1},[]];
    }};
    const db={getConnection:async()=>conn} as unknown as Pool;
    const next=copy();next.callouts[0]!.label='A revised label';
    const result=await saveHero(db,config,next,7,'request-123');
    expect(result.edit.callouts[0]!.label).toBe('A revised label');
    expect(statements).toContain('COMMIT');
    expect(statements.filter(sql=>sql.startsWith('UPDATE'))).toEqual(['UPDATE hero_hotspot_content SET label=?,updated_by=? WHERE hotspot_key=?']);
    expect(statements.some(sql=>sql.startsWith('INSERT INTO content_revisions'))).toBe(true);
    expect(statements.some(sql=>sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  });
  it('rolls back the unified edit when a later Hero update fails',async()=>{
    const calls:string[]=[];
    const conn={beginTransaction:async()=>{calls.push('BEGIN');},commit:async()=>{calls.push('COMMIT');},rollback:async()=>{calls.push('ROLLBACK');},release:()=>{},execute:async(options:{sql:string})=>{
      const sql=options.sql;calls.push(sql);
      if(sql.includes('FROM hero_settings'))return [[{heading_line_2:current.headingLine2,description_line_1:current.descriptionLine1,description_line_2:current.descriptionLine2}],[]];
      if(sql.includes('FROM hero_trust_signals'))return [current.trustSignals.map(item=>({slot:item.slot,numeric_value:item.numericValue,suffix:item.suffix,label:item.label})),[]];
      if(sql.includes('FROM hero_workspace_content'))return [current.workspaces.map(item=>({workspace_key:item.key,primary_cta_label:item.primaryLabel,primary_cta_url:item.primaryUrl,secondary_cta_label:item.secondaryLabel,secondary_cta_url:item.secondaryUrl})),[]];
      if(sql.includes('FROM hero_hotspot_content'))return [current.callouts.map(item=>({hotspot_key:item.key,label:item.label,numeric_value:null,numeric_suffix:null})),[]];
      if(sql.startsWith('UPDATE hero_hotspot_content'))throw new Error('Simulated update failure');
      return [{affectedRows:1},[]];
    }};
    const next=copy();next.headingLine2='Fresh heading';next.callouts[0]!.label='Fresh label';
    await expect(saveHero({getConnection:async()=>conn} as unknown as Pool,config,next,7,'request-456')).rejects.toThrow('Simulated update failure');
    expect(calls).toContain('UPDATE hero_settings SET heading_line_2=?,description_line_1=?,description_line_2=?,updated_by=? WHERE id=1');
    expect(calls).toContain('ROLLBACK');expect(calls).not.toContain('COMMIT');
  });
});
