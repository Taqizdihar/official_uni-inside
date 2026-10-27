import {describe,expect,it} from 'vitest';
import {heroEdit,heroCallouts,validateHeroEdit,heroThreeLineReady,saveHero,displayCallout,splitCallout,type HeroEdit} from '../src/services/hero';
import {loadConfig} from '../src/config/env';
import type {Pool} from 'mysql2/promise';

const current:HeroEdit={headingLine1:'Ideas',headingLine2:'Stories Crafted.',descriptionLine1:'From visual storytelling to physical creation,',descriptionLine2:'every idea is shaped with purpose.',trustSignals:[1,2,3].map(slot=>({slot,numericValue:10,suffix:'+',label:'PROJECTS'})),workspaces:['studio','craft'].map(key=>({key,primaryLabel:'Explore Our Services',primaryUrl:'/services',secondaryLabel:'See Our Work',secondaryUrl:'/projects'})),callouts:heroCallouts.map(key=>({key,label:key===heroCallouts[0]?'50+ SHOOTING HOURS':'READY-MADE & CUSTOM PRODUCTS'}))};
const copy=()=>structuredClone(current);
const validate=(next:HeroEdit,ready=false)=>validateHeroEdit(next,current,ready);
const config=loadConfig({DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),CORS_ALLOWED_ORIGINS:'http://localhost:3000'});
describe('Hero editor contract',()=>{
  it('accepts the exact trust label limit and rejects the next character, including Unicode code points',()=>{
    const next=copy();next.trustSignals[0]!.label='ABCDEFGHIJKLMN';expect(validate(next)).toEqual([]);
    next.trustSignals[0]!.label+='O';expect(validate(next)).toContainEqual(expect.objectContaining({path:'trustSignals.0.label'}));
    next.trustSignals[0]!.label='😀'.repeat(14);expect(validate(next)).toEqual([]);
  });
  it('checks all text limits while preserving unchanged legacy values',()=>{
    const cases:[(edit:HeroEdit)=>void,string][]=[
      [v=>{v.headingLine1='Ideas1234567890';},'headingLine1'],
      [v=>{v.headingLine2='x'.repeat(19);},'headingLine2'],
      [v=>{v.descriptionLine1='x'.repeat(51);},'descriptionLine1'],
      [v=>{v.descriptionLine2='x'.repeat(51);},'descriptionLine2'],
      [v=>{v.workspaces[0]!.primaryLabel='x'.repeat(26);},'workspaces.0.primaryLabel'],
      [v=>{v.callouts[0]!.label='x'.repeat(31);},'callouts.0.label'],
    ];
    for(const [change,path] of cases){const next=copy();change(next);expect(validate(next)).toContainEqual(expect.objectContaining({path}));}
    const legacy=copy();legacy.callouts[0]!.label='x'.repeat(40);
    expect(validateHeroEdit({...legacy,descriptionLine2:'Updated'},legacy,false)).toEqual([]);
  });
  it('keeps Ideas at the start of an editable first line',()=>{
    const next=copy();next.headingLine1='Ideas123456789';expect(validate(next)).toEqual([]);
    next.headingLine1='Ideas 12345678';expect(validate(next)).toEqual([]);
    next.headingLine1='Ideas 123456789';expect(validate(next)).toContainEqual(expect.objectContaining({path:'headingLine1',message:'Maksimal 9 karakter setelah Ideas.'}));
    next.headingLine1='Our Ideas';expect(validate(next)).toContainEqual(expect.objectContaining({path:'headingLine1'}));
    const legacy=copy();legacy.headingLine1='Ideas Captured.';
    expect(validateHeroEdit({...legacy,descriptionLine2:'Updated'},legacy,false)).toEqual([]);
  });
  it('round-trips a full callout through the existing numeric columns',()=>{
    expect(displayCallout({numeric_value:50,numeric_suffix:'+',label:'SHOOTING HOURS'})).toBe('50+ SHOOTING HOURS');
    expect(splitCallout('50+ SHOOTING HOURS')).toEqual({numericValue:50,numericSuffix:'+',label:'SHOOTING HOURS'});
    expect(splitCallout('STUDIO LIGHTING')).toEqual({numericValue:null,numericSuffix:null,label:'STUDIO LIGHTING'});
    expect(splitCallout('0050+ SHOOTING HOURS')).toEqual({numericValue:null,numericSuffix:null,label:'0050+ SHOOTING HOURS'});
  });
  it('rejects technical fields, unknown identities and unready third-line writes',()=>{
    expect(heroEdit.safeParse({...current,intro_enabled:0}).success).toBe(false);
    const slot=copy();slot.trustSignals[0]!.slot=4;expect(validate(slot)).toContainEqual(expect.objectContaining({path:'trustSignals'}));
    const workspace=copy();workspace.workspaces[0]!.key='other';expect(validate(workspace)).toContainEqual(expect.objectContaining({path:'workspaces'}));
    const callout=copy();callout.callouts[0]!.key='studio_fake';expect(validate(callout)).toContainEqual(expect.objectContaining({path:'callouts'}));
    const third=copy();third.headingLine3='A third line';expect(validate(third)).toContainEqual(expect.objectContaining({path:'headingLine3'}));
    const ready={...current,headingLine3:'Saved line'};expect(validateHeroEdit({...ready,headingLine3:'x'.repeat(19)},ready,true)).toContainEqual(expect.objectContaining({path:'headingLine3'}));
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
  it('opens an unseeded third line when the column and flag are ready',async()=>{
    const enabled={...config,HERO_THREE_LINE_ENABLED:true};let queries=0;
    const db={execute:async()=>{queries++;return [[{total:1}],[]];}} as unknown as Pool;
    expect(await heroThreeLineReady(db,enabled)).toBe(true);expect(queries).toBe(1);
    const blank={...current,headingLine3:''};
    expect(validateHeroEdit({...blank,headingLine2:'New second line'},blank,true)).toEqual([]);
    expect(validateHeroEdit({...blank,headingLine3:'Made tangible'},blank,true)).toEqual([]);
    expect(validateHeroEdit({...blank,headingLine3:'x'.repeat(19)},blank,true)).toContainEqual(expect.objectContaining({path:'headingLine3'}));
  });
  it('saves an Ideas-prefixed first line and the complete numeric callout together',async()=>{
    const statements:string[]=[];let firstLine=current.headingLine1,label='SHOOTING HOURS',numeric:number|null=50,suffix:string|null='+';
    const conn={beginTransaction:async()=>{statements.push('BEGIN');},commit:async()=>{statements.push('COMMIT');},rollback:async()=>{statements.push('ROLLBACK');},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
      const sql=options.sql;statements.push(sql);
      if(sql.includes('FROM hero_settings'))return [[{heading_line_1:firstLine,heading_line_2:current.headingLine2,description_line_1:current.descriptionLine1,description_line_2:current.descriptionLine2}],[]];
      if(sql.includes('FROM hero_trust_signals'))return [current.trustSignals.map(item=>({slot:item.slot,numeric_value:item.numericValue,suffix:item.suffix,label:item.label})),[]];
      if(sql.includes('FROM hero_workspace_content'))return [current.workspaces.map(item=>({workspace_key:item.key,primary_cta_label:item.primaryLabel,primary_cta_url:item.primaryUrl,secondary_cta_label:item.secondaryLabel,secondary_cta_url:item.secondaryUrl})),[]];
      if(sql.includes('FROM hero_hotspot_content'))return [current.callouts.map(item=>({hotspot_key:item.key,label:item.key===heroCallouts[0]?label:item.label,numeric_value:item.key===heroCallouts[0]?numeric:null,numeric_suffix:item.key===heroCallouts[0]?suffix:null})),[]];
      if(sql.startsWith('UPDATE hero_settings'))firstLine=String(values[0]);
      if(sql.startsWith('UPDATE hero_hotspot_content')){label=String(values[0]);numeric=Number(values[1]);suffix=String(values[2]);}
      if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
      return [{affectedRows:1},[]];
    }};
    const db={getConnection:async()=>conn} as unknown as Pool;
    const next=copy();next.headingLine1='Ideas 3D';next.callouts[0]!.label='51+ SHOOTING HOURS';
    const result=await saveHero(db,config,next,7,'request-123');
    expect(result.edit.headingLine1).toBe('Ideas 3D');
    expect(result.edit.callouts[0]!.label).toBe('51+ SHOOTING HOURS');
    expect(statements).toContain('COMMIT');
    expect(statements.filter(sql=>sql.startsWith('UPDATE'))).toEqual(['UPDATE hero_settings SET heading_line_1=?,heading_line_2=?,description_line_1=?,description_line_2=?,updated_by=? WHERE id=1','UPDATE hero_hotspot_content SET label=?,numeric_value=?,numeric_suffix=?,updated_by=? WHERE hotspot_key=?']);
    expect(statements.some(sql=>sql.startsWith('INSERT INTO content_revisions'))).toBe(true);
    expect(statements.some(sql=>sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  });
  it('rolls back the unified edit when a later Hero update fails',async()=>{
    const calls:string[]=[];
    const conn={beginTransaction:async()=>{calls.push('BEGIN');},commit:async()=>{calls.push('COMMIT');},rollback:async()=>{calls.push('ROLLBACK');},release:()=>{},execute:async(options:{sql:string})=>{
      const sql=options.sql;calls.push(sql);
      if(sql.includes('FROM hero_settings'))return [[{heading_line_1:current.headingLine1,heading_line_2:current.headingLine2,description_line_1:current.descriptionLine1,description_line_2:current.descriptionLine2}],[]];
      if(sql.includes('FROM hero_trust_signals'))return [current.trustSignals.map(item=>({slot:item.slot,numeric_value:item.numericValue,suffix:item.suffix,label:item.label})),[]];
      if(sql.includes('FROM hero_workspace_content'))return [current.workspaces.map(item=>({workspace_key:item.key,primary_cta_label:item.primaryLabel,primary_cta_url:item.primaryUrl,secondary_cta_label:item.secondaryLabel,secondary_cta_url:item.secondaryUrl})),[]];
      if(sql.includes('FROM hero_hotspot_content'))return [current.callouts.map(item=>({hotspot_key:item.key,label:item.label,numeric_value:null,numeric_suffix:null})),[]];
      if(sql.startsWith('UPDATE hero_hotspot_content'))throw new Error('Simulated update failure');
      return [{affectedRows:1},[]];
    }};
    const next=copy();next.headingLine2='Fresh heading';next.callouts[0]!.label='Fresh label';
    await expect(saveHero({getConnection:async()=>conn} as unknown as Pool,config,next,7,'request-456')).rejects.toThrow('Simulated update failure');
    expect(calls).toContain('UPDATE hero_settings SET heading_line_1=?,heading_line_2=?,description_line_1=?,description_line_2=?,updated_by=? WHERE id=1');
    expect(calls).toContain('ROLLBACK');expect(calls).not.toContain('COMMIT');
  });
});
