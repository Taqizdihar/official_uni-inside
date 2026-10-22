import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {getSection,saveSection,validateSection,validButtonDestination,type SectionName} from '../src/services/homepageSections';
import {reorderAchievements} from '../src/services/achievementOrder';
import {eventSchema,normalizeEvent} from '../src/services/analytics';
import {loadConfig} from '../src/config/env';
import {publicList} from '../src/repositories/content';
import {resources} from '../src/schemas/resources';

const cases:[SectionName,Record<string,string>,string,number][]=[
  ['contact',{heading:'CONTACT US',description:"Let's get connected"},'heading',10],
  ['achievements',{heading:'ACHIEVEMENTS',description:'Selected milestones'},'heading',12],
  ['news',{heading:'NEWS & STORIES',description:'Studio news',primary_cta_label:'SEE ALL',primary_cta_url:'/news'},'primary_cta_label',15],
  ['services',{heading:'OUR SERVICES',primary_cta_label:'View All Services',primary_cta_url:'/services'},'primary_cta_label',20],
  ['products',{description:'Discover our products',primary_cta_label:'View All Products',primary_cta_url:'/products'},'primary_cta_label',20],
];
describe('Homepage section contracts',()=>{
  it('enforces exact code point limits on changed fields and preserves unchanged legacy copy',()=>{
    for(const [name,old,field,max] of cases){const valid={...old,[field]:'😀'.repeat(max)};expect(validateSection(name,valid,old)).toEqual([]);expect(validateSection(name,{...valid,[field]:'😀'.repeat(max+1)},old)).toContainEqual(expect.objectContaining({path:field}));}
    const old={...cases[2]![1],description:'x'.repeat(76)};
    expect(validateSection('news',{...old,heading:'Studio News'},old)).toEqual([]);
    expect(validateSection('news',{...old,description:'y'.repeat(51)},old)).toContainEqual(expect.objectContaining({path:'description'}));
  });
  it('rejects unsafe destinations and accepts safe paths or HTTPS URLs',()=>{
    for(const value of ['/news','/#achievements','https://example.com/path?x=1#part'])expect(validButtonDestination(value)).toBe(true);
    for(const value of ['//example.com','javascript:alert(1)','data:text/html,x','http://example.com','https://user:password@example.com','/bad path','/bad\\path'])expect(validButtonDestination(value)).toBe(false);
  });
  it('records internal CTA paths while refusing unsafe navigation schemes',()=>{
    const config=loadConfig({DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40)});
    const event={eventUuid:'4eb72878-cbbb-44a8-9230-c6078cae5126',eventName:'cta_click',pagePath:'/',linkDestination:'/#achievements'};
    expect(normalizeEvent(eventSchema.parse(event),undefined,undefined,config).destination).toBe('/#achievements');
    expect(eventSchema.safeParse({...event,linkDestination:'javascript:alert(1)'}).success).toBe(false);
  });
  it('queries only published achievements in stable saved order and excludes scheduled news',async()=>{
    const calls:string[]=[];const db={execute:async(options:{sql:string})=>{calls.push(options.sql);return [[],[]];}} as unknown as Pool;
    await publicList(db,resources.achievements!,100,0);
    await publicList(db,resources.news!,4,0);
    expect(calls[0]).toContain("status='published'");expect(calls[0]).toContain('sort_order ASC,id ASC');
    expect(calls[1]).toContain("status='published'");expect(calls[1]).toContain('published_at DESC,id DESC');expect(calls[1]).not.toContain("status='scheduled'");
  });
  it('never queries missing placement storage while capability is disabled',async()=>{
    const sql:string[]=[];const db={execute:async(options:{sql:string})=>{sql.push(options.sql);return [[{heading:'CONTACT US',description:'Connected'}],[]];}} as unknown as Pool;
    const result=await getSection(db,'contact');expect(result.capabilities.contactSocialPlacements).toBe(false);expect(result.capabilities.contactCraftUrl).toBe(false);expect(sql).toEqual(['SELECT heading,description FROM contact_section_settings WHERE id=?']);
  });
  it('updates only approved columns and rejects hidden fields before a write',async()=>{
    const statements:string[]=[];let heading='OUR SERVICES';
    const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{statements.push(options.sql);if(options.sql.startsWith('SELECT heading'))return [[{heading,primary_cta_label:'View All Services',primary_cta_url:'/services'}],[]];if(options.sql.startsWith('UPDATE homepage_section_settings'))heading=String(values[0]);if(options.sql.includes('MAX(revision_number)'))return [[{next:1}],[]];return [{affectedRows:1},[]];}};
    const db={getConnection:async()=>conn} as unknown as Pool;
    await expect(saveSection(db,'services',{heading:'New Services',primary_cta_label:'View All Services',primary_cta_url:'/services',is_visible:false},1,'req')).rejects.toThrow();
    expect(statements).toEqual([]);
    await saveSection(db,'services',{heading:'New Services',primary_cta_label:'View All Services',primary_cta_url:'/services'},1,'req');
    expect(statements.find(sql=>sql.startsWith('UPDATE'))).toBe('UPDATE homepage_section_settings SET heading=?,updated_by=? WHERE section_key=?');
    expect(statements).toContain('INSERT INTO audit_logs (actor_user_id,action_code,entity_type,entity_id,before_json,after_json,request_id,ip_hash,user_agent) VALUES (?,?,?,?,?,?,?,?,?)');
  });
});
describe('Achievement ordering',()=>{
  it('rejects duplicates and stale IDs without writing',async()=>{
    const calls:string[]=[];const conn={beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(options:{sql:string})=>{calls.push(options.sql);return [[{id:1,status:'draft'},{id:2,status:'draft'}],[]];}};
    const db={getConnection:async()=>conn} as unknown as Pool;
    await expect(reorderAchievements(db,[1,1],[1,2],1,'req',true)).rejects.toThrow();expect(calls).toEqual([]);
    await expect(reorderAchievements(db,[1,3],[1,2],1,'req',true)).rejects.toThrow();expect(calls.every(sql=>!sql.startsWith('UPDATE'))).toBe(true);
    await expect(reorderAchievements(db,[2,1],[2,1],1,'req',true)).rejects.toThrow();
  });
  it('rolls back when a later update fails',async()=>{
    const calls:string[]=[];const conn={beginTransaction:async()=>{calls.push('BEGIN');},commit:async()=>{calls.push('COMMIT');},rollback:async()=>{calls.push('ROLLBACK');},release:()=>{},execute:async(options:{sql:string})=>{calls.push(options.sql);if(options.sql.startsWith('SELECT id'))return [[{id:1,status:'published'},{id:2,status:'draft'}],[]];if(options.sql.startsWith('UPDATE')&&calls.filter(sql=>sql.startsWith('UPDATE')).length===2)throw new Error('write failed');return [{affectedRows:1},[]];}};
    const db={getConnection:async()=>conn} as unknown as Pool;
    await expect(reorderAchievements(db,[2,1],[1,2],1,'req',false)).rejects.toMatchObject({status:403});
    await expect(reorderAchievements(db,[2,1],[1,2],1,'req',true)).rejects.toThrow('write failed');expect(calls).toContain('ROLLBACK');expect(calls).not.toContain('COMMIT');
  });
});
