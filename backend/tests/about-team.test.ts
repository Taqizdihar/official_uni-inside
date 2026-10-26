import {describe,it,expect} from 'vitest';
import request from 'supertest';
import type {Pool} from 'mysql2/promise';
import {createApp} from '../src/app';
import {loadConfig} from '../src/config/env';
import {csrfToken} from '../src/middleware/auth';
import {aboutEditFallback,aboutPreviewDefaults,canManageTemplate,characterCount,listIssues,safeMemberProfile,textIssues,validateAboutEdit,validateAboutPreview,validatePartner,validateTeamMember,type AboutEdit,type TeamMemberInput} from '../src/contracts/aboutTeam';
import {getAbout,getTeam,saveAbout,saveTeam,updateTeamTemplate} from '../src/services/aboutTeam';
import {saveHomepageCollection,validateCollectionMedia} from '../src/services/homepageCollections';
import * as content from '../src/services/content';

const config=loadConfig({DB_HOST:'localhost',DB_NAME:'isolated',DB_USER:'test',AUTH_TOKEN_PEPPER:'a'.repeat(40),ANALYTICS_HASH_PEPPER:'b'.repeat(40),LOG_LEVEL:'silent'});
const validAbout=():AboutEdit=>({...structuredClone(aboutEditFallback),intro:{subtitle:'CREATIVE BY NATURE, TECHNICAL BY DESIGN',description:'We collaborate across multimedia production, creative technology, and 3D printing to turn ideas into purposeful experiences and tangible work.'},guides:{...structuredClone(aboutEditFallback.guides),heading:'HOW WE WORK'}});
function aboutFixture(failOn='',permissions=['homepage.view','homepage.update'],role='administrator'){
  let state=validAbout(),heading='MEET OUR TEAM',snapshot:AboutEdit|null=null;
  const calls:{sql:string;values:unknown[]}[]=[];
  const execute=async(options:{sql:string},values:unknown[]=[])=>{
    const sql=options.sql;calls.push({sql,values});
    if(failOn&&sql.startsWith(failOn))throw new Error('Simulated write failure');
    if(sql.includes('FROM auth_sessions'))return [[{session_id:2,user_id:7,role_id:2,role_code:role,last_activity_at:new Date().toISOString().replace('T',' ').replace('Z','')}],[]];
    if(sql.includes('FROM role_permissions'))return [permissions.map(code=>({code})),[]];
    if(sql.startsWith('UPDATE auth_sessions'))return [{affectedRows:1},[]];
    if(sql.startsWith('SELECT lead_text'))return [[{lead_text:state.intro.subtitle,body_text:state.intro.description,workspaces_heading:state.ecosystem.heading,principles_heading:state.guides.heading}],[]];
    if(sql.includes('FROM about_workspaces'))return [state.ecosystem.workspaces.map(item=>({workspace_key:item.key,short_label:item.subtitle,description:item.description})),[]];
    if(sql.includes('FROM about_principles'))return [state.guides.principles.map(item=>({slot:item.slot,title:item.heading,description:item.description})),[]];
    if(sql.includes('FROM homepage_section_settings'))return [[{heading:state.partnersHeading}],[]];
    if(sql.includes('FROM team_section_settings'))return [[{heading}],[]];
    if(sql.startsWith('UPDATE about_settings')){state.intro={subtitle:String(values[0]),description:String(values[1])};state.ecosystem.heading=String(values[2]);state.guides.heading=String(values[3]);}
    else if(sql.startsWith('UPDATE about_workspaces')){const row=state.ecosystem.workspaces.find(item=>item.key===values[3])!;row.subtitle=String(values[0]);row.description=String(values[1]);}
    else if(sql.startsWith('UPDATE about_principles')){const row=state.guides.principles.find(item=>item.slot===values[3])!;row.heading=String(values[0]);row.description=String(values[1]);}
    else if(sql.startsWith('UPDATE homepage_section_settings'))state.partnersHeading=String(values[0]);
    else if(sql.startsWith('UPDATE team_section_settings'))heading=String(values[0]);
    else if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
    else if(!sql.startsWith('INSERT INTO audit_logs')&&!sql.startsWith('INSERT INTO content_revisions'))throw new Error(`Unexpected query: ${sql}`);
    return [{affectedRows:1},[]];
  };
  const conn={execute,beginTransaction:async()=>{snapshot=structuredClone(state);calls.push({sql:'BEGIN',values:[]});},commit:async()=>{calls.push({sql:'COMMIT',values:[]});},rollback:async()=>{if(snapshot)state=snapshot;calls.push({sql:'ROLLBACK',values:[]});},release:()=>{}};
  return {db:{execute,getConnection:async()=>conn} as unknown as Pool,calls,state:()=>state};
}
function collectionFixture(format='avif',failOn=''){
  let record:Record<string,unknown>|undefined;
  const calls:{sql:string;values:unknown[]}[]=[];
  const conn={beginTransaction:async()=>{calls.push({sql:'BEGIN',values:[]});},commit:async()=>{calls.push({sql:'COMMIT',values:[]});},rollback:async()=>{calls.push({sql:'ROLLBACK',values:[]});},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
    const sql=options.sql;calls.push({sql,values});if(failOn&&sql.startsWith(failOn))throw new Error('Simulated collection failure');
    if(sql.includes('FROM media_assets'))return [[{id:10,format,width_px:1080,height_px:1350}],[]];
    if(sql.startsWith('SELECT id FROM'))return [[],[]];
    if(sql.startsWith('INSERT INTO `team_members`')||sql.startsWith('INSERT INTO `partners`')){const columns=sql.slice(sql.indexOf('(')+1,sql.indexOf(')')).split(',').map(value=>value.replace(/`/g,''));record={id:4,...Object.fromEntries(columns.map((column,index)=>[column,values[index]]))};return [{insertId:4,affectedRows:1},[]];}
    if(sql.startsWith('SELECT *'))return [[record],[]];
    if(sql.startsWith('UPDATE `')){const fields=[...sql.matchAll(/`([a-z_]+)`=\?/g)].map(match=>match[1]!);fields.pop();fields.forEach((field,index)=>{if(record)record[field]=values[index];});return [{affectedRows:1},[]];}
    if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
    if(sql.startsWith('INSERT INTO audit_logs')||sql.startsWith('INSERT INTO content_revisions'))return [{affectedRows:1},[]];
    throw new Error(`Unexpected query: ${sql}`);
  }};
  return {db:{execute:conn.execute,getConnection:async()=>conn} as unknown as Pool,calls,record:()=>record};
}
const member:TeamMemberInput={full_name:'Taqi',role_title:'Technology',short_bio:'Builds useful creative tools.',photo_media_id:10,status:'draft',linkedin_url:null,instagram_url:null,x_url:null,github_url:'https://github.com/taqi'};
const actor={id:7,permissions:new Set(['team.create','team.update','team.publish','team.archive','partners.create','partners.update','partners.publish','partners.archive'])};

describe('About Us fixed structure',()=>{
  it('validates every supported text boundary using Unicode code points',()=>{
    const current=validAbout();expect(validateAboutEdit(current)).toEqual([]);
    const fields:[string,number,(next:AboutEdit,value:string)=>void][]=[['intro.subtitle',50,(n,v)=>{n.intro.subtitle=v;}],['intro.description',170,(n,v)=>{n.intro.description=v;}],['ecosystem.heading',40,(n,v)=>{n.ecosystem.heading=v;}],['ecosystem.workspaces.0.subtitle',30,(n,v)=>{n.ecosystem.workspaces[0]!.subtitle=v;}],['ecosystem.workspaces.1.description',180,(n,v)=>{n.ecosystem.workspaces[1]!.description=v;}],['guides.heading',20,(n,v)=>{n.guides.heading=v;}],['guides.principles.0.heading',30,(n,v)=>{n.guides.principles[0]!.heading=v;}],['guides.principles.0.description',110,(n,v)=>{n.guides.principles[0]!.description=v;}],['partnersHeading',30,(n,v)=>{n.partnersHeading=v;}]];
    for(const [path,max,change] of fields){const next=structuredClone(current);change(next,'😀'.repeat(max));expect(validateAboutEdit(next,current)).toEqual([]);change(next,'😀'.repeat(max+1));expect(validateAboutEdit(next,current)).toContainEqual(expect.objectContaining({path}));}
    const reference='We shape better outcomes by listening closely, sharing perspectives, and building alongside our collaborators.';
    expect(characterCount(reference)).toBe(110);expect(textIssues('description',reference,110)).toEqual([]);expect(textIssues('description',reference+'!',110)).toHaveLength(1);
  });
  it('preserves unchanged legacy values and rejects altered identities',()=>{
    const old=structuredClone(aboutEditFallback),next=structuredClone(old);next.partnersHeading='Our friends';expect(validateAboutEdit(next,old)).toEqual([]);
    next.ecosystem.workspaces.reverse();expect(validateAboutEdit(next,old)).toContainEqual(expect.objectContaining({path:'ecosystem.workspaces'}));next.guides.principles.pop();expect(validateAboutEdit(next,old)).toContainEqual(expect.objectContaining({path:'guides.principles'}));
  });
  it('prepares exact missing-field limits, lists, paragraphs, and fixed Mission points',()=>{
    const preview=structuredClone(aboutPreviewDefaults);expect(validateAboutPreview(preview)).toEqual([]);
    expect(validateAboutPreview({...preview,highlight:'x'.repeat(51)})).toContainEqual(expect.objectContaining({path:'highlight'}));
    expect(validateAboutPreview({...preview,visionMission:{...preview.visionMission,missionPoints:['a','b']}})).toContainEqual(expect.objectContaining({path:'visionMission.missionPoints'}));
    expect(validateAboutPreview({...preview,visionMission:{...preview.visionMission,missionPoints:['a'.repeat(71),'b','c']}})).toContainEqual(expect.objectContaining({path:'visionMission.missionPoints.0'}));
    expect(listIssues('tags',['DESIGN',' design '],5,10)).toContainEqual(expect.objectContaining({message:'Isian tidak boleh berulang.'}));
    expect(listIssues('tags',['12345678901'],5,10)).toHaveLength(1);expect(listIssues('tags',['a','b','c','d','e','f'],5,10)).toHaveLength(1);
    expect(textIssues('clients',preview.clients.description,380,undefined,true)).toEqual([]);expect(preview.clients.description).toContain('\n\n');expect(textIssues('clients','<script>x</script>',380,undefined,true)).toHaveLength(1);
    expect(validateAboutPreview({...preview,clients:{...preview.clients,heading:'x'.repeat(61),description:'x'.repeat(381),types:['a'.repeat(26)]}}).map(item=>item.path)).toEqual(expect.arrayContaining(['clients.heading','clients.description','clients.types.0']));
  });
  it('enforces the remaining editorial boundaries independently',()=>{
    for(const [max,change,path] of [
      [30,(p:typeof aboutPreviewDefaults,v:string)=>{p.ecosystemEyebrow=v;},'ecosystemEyebrow'],
      [100,(p:typeof aboutPreviewDefaults,v:string)=>{p.ecosystemDescription=v;},'ecosystemDescription'],
      [30,(p:typeof aboutPreviewDefaults,v:string)=>{p.visionMission.eyebrow=v;},'visionMission.eyebrow'],
      [60,(p:typeof aboutPreviewDefaults,v:string)=>{p.visionMission.visionHeading=v;},'visionMission.visionHeading'],
      [130,(p:typeof aboutPreviewDefaults,v:string)=>{p.visionMission.visionDescription=v;},'visionMission.visionDescription'],
      [60,(p:typeof aboutPreviewDefaults,v:string)=>{p.visionMission.missionHeading=v;},'visionMission.missionHeading'],
      [30,(p:typeof aboutPreviewDefaults,v:string)=>{p.guidesEyebrow=v;},'guidesEyebrow'],
      [30,(p:typeof aboutPreviewDefaults,v:string)=>{p.clients.eyebrow=v;},'clients.eyebrow'],
    ] as const){const preview=structuredClone(aboutPreviewDefaults);change(preview,'😀'.repeat(max));expect(validateAboutPreview(preview)).toEqual([]);change(preview,'😀'.repeat(max+1));expect(validateAboutPreview(preview)).toContainEqual(expect.objectContaining({path}));}
  });
  it('reads only existing columns and does not query pending storage',async()=>{
    const fixture=aboutFixture(),result=await getAbout(fixture.db);
    expect(result.capabilities).toEqual({aboutEditorial:false,workspaceTags:false,collaboratorTypes:false,teamCardTemplate:false});
    expect(fixture.calls).toHaveLength(4);expect(fixture.calls.some(call=>/highlight|mission|tags|collaborator|card_template/.test(call.sql))).toBe(false);
  });
  it('saves supported changes together, preserves hidden fields, and logs audit/revision',async()=>{
    const fixture=aboutFixture(),before=await getAbout(fixture.db),next=structuredClone(before.edit);next.intro.subtitle='Studio story';next.ecosystem.workspaces[1]!.description='Purposeful products.';next.guides.principles[0]!.heading='Collaborate';next.partnersHeading='OUR PARTNERS';
    const result=await saveAbout(fixture.db,{edit:next,expectedVersion:before.version},7,'request');expect(result.edit).toEqual(next);expect(fixture.calls.map(call=>call.sql)).toContain('COMMIT');
    const updates=fixture.calls.filter(call=>call.sql.startsWith('UPDATE'));expect(updates).toHaveLength(4);expect(updates.some(call=>/is_visible|sort_order|cta_|icon_key|SET heading=.+about_settings/.test(call.sql))).toBe(false);
    expect(fixture.calls.some(call=>call.sql.startsWith('INSERT INTO audit_logs'))).toBe(true);expect(fixture.calls.some(call=>call.sql.startsWith('INSERT INTO content_revisions'))).toBe(true);
    await expect(saveAbout(fixture.db,{edit:next,expectedVersion:before.version},7,'stale')).rejects.toMatchObject({status:409});
  });
  it('rolls back earlier changes when a later write fails and rejects pending payloads',async()=>{
    const fixture=aboutFixture('UPDATE about_principles'),before=await getAbout(fixture.db),next=structuredClone(before.edit);next.intro.subtitle='Changed';next.guides.principles[0]!.heading='Changed';
    await expect(saveAbout(fixture.db,{edit:next,expectedVersion:before.version},7,'req')).rejects.toThrow('Simulated write failure');expect(fixture.state()).toEqual(before.edit);expect(fixture.calls.some(call=>call.sql==='COMMIT')).toBe(false);
    await expect(saveAbout(fixture.db,{edit:{...next,highlight:'fake'},expectedVersion:before.version},7,'req')).rejects.toMatchObject({status:400});
  });
});

describe('Our Team and Canva',()=>{
  it('enforces Heading 15 and preserves other Team settings',async()=>{
    const fixture=aboutFixture(),saved=await getTeam(fixture.db,'editor',false);
    expect(saved.template.url).toBe('https://canva.link/kt3du8vvev19zrk');expect(saved.template.roleMayEdit).toBe(false);expect(saved.template.enabled).toBe(false);
    await expect(saveTeam(fixture.db,{edit:{heading:'x'.repeat(16)},expectedVersion:saved.version},7,'editor',false,'req')).rejects.toMatchObject({status:400});
    await saveTeam(fixture.db,{edit:{heading:'x'.repeat(15)},expectedVersion:saved.version},7,'editor',false,'req');expect(fixture.calls.find(call=>call.sql.startsWith('UPDATE team_section_settings'))?.sql).toBe('UPDATE team_section_settings SET heading=?,updated_by=? WHERE id=1');
  });
  it('authorizes template changes by canonical role and keeps persistence unavailable',async()=>{
    const db=aboutFixture().db;
    for(const role of ['editor','author','viewer']){expect(canManageTemplate(role)).toBe(false);await expect(updateTeamTemplate(db,{url:'https://canva.link/template'},7,role,'req')).rejects.toMatchObject({status:403});}
    for(const role of ['super_admin','administrator']){expect(canManageTemplate(role)).toBe(true);await expect(updateTeamTemplate(db,{url:'https://canva.link/template'},7,role,'req')).rejects.toMatchObject({status:503});await expect(updateTeamTemplate(db,{url:'javascript:alert(1)'},7,role,'req')).rejects.toMatchObject({status:400});}
  });
  it('requires card details and supports only valid configured member profiles',()=>{
    expect(validateTeamMember(member)).toEqual([]);
    for(const key of ['full_name','role_title','short_bio'] as const)expect(validateTeamMember({...member,[key]:' '})).toContainEqual(expect.objectContaining({path:key}));
    expect(validateTeamMember({...member,photo_media_id:0})).toContainEqual(expect.objectContaining({path:'photo_media_id'}));
    for(const value of ['javascript:alert(1)','https://github.com/','https://user:pass@github.com/name','https://evil.example/name',`https://github.com/${'a'.repeat(1000)}`])expect(safeMemberProfile(value,'github_url')).toBe(false);
    expect(safeMemberProfile('https://github.com/name','github_url')).toBe(true);expect(safeMemberProfile('https://www.instagram.com/member','instagram_url')).toBe(true);
  });
});

describe('Homepage Team and Partner CRUD',()=>{
  it('atomically creates, edits, publishes and soft-deletes Team cards without creating CMS users',async()=>{
    const fixture=collectionFixture();const saved=await saveHomepageCollection(fixture.db,'team-members',null,member,actor,'create','uni-inside');expect(saved.record?.id).toBe(4);
    await saveHomepageCollection(fixture.db,'team-members',4,{...member,full_name:'Updated',status:'published'},actor,'update','uni-inside');
    expect(fixture.record()?.full_name).toBe('Updated');expect(fixture.record()?.status).toBe('published');expect(fixture.calls.some(call=>/published_at|INSERT INTO users|invitations|auth_sessions/.test(call.sql))).toBe(false);
    await content.remove(fixture.db,'team-members','4',actor,'delete');expect(fixture.calls.some(call=>call.sql.startsWith('UPDATE `team_members` SET deleted_at'))).toBe(true);
    expect(fixture.calls.some(call=>call.sql.includes("folder_path LIKE ?")&&call.values.includes('uni-inside/utama/%'))).toBe(true);
  });
  it('requires a Partner logo and saves an optional safe URL',async()=>{
    expect(validatePartner({name:'Partner',logo_media_id:0,website_url:null,status:'draft'})).toContainEqual(expect.objectContaining({path:'logo_media_id'}));
    expect(validatePartner({name:'Partner',logo_media_id:10,website_url:'https://u:p@example.com',status:'draft'})).toContainEqual(expect.objectContaining({path:'website_url'}));
    const fixture=collectionFixture();await saveHomepageCollection(fixture.db,'partners',null,{name:'Partner',logo_media_id:10,website_url:null,status:'published'},actor,'req','uni-inside');expect(fixture.record()?.slug).toBe('partner');expect(fixture.record()?.website_url).toBeNull();expect(fixture.calls.some(call=>call.sql.includes('published_at'))).toBe(false);
    await saveHomepageCollection(fixture.db,'partners',4,{name:'Renamed',logo_media_id:10,website_url:'https://example.com',status:'published'},actor,'req2','uni-inside');expect(fixture.record()?.slug).toBe('partner');
  });
  it('enforces publication permission, rejects unsupported media, and rolls back failed logging',async()=>{
    const fixture=collectionFixture();await expect(saveHomepageCollection(fixture.db,'team-members',null,{...member,status:'published'},{id:8,permissions:new Set(['team.create'])},'req','uni-inside')).rejects.toMatchObject({status:403});expect(fixture.calls).toHaveLength(0);
    await expect(validateCollectionMedia(collectionFixture('svg').db,10,'team-members','uni-inside')).rejects.toThrow();
    const failed=collectionFixture('avif','INSERT INTO audit_logs');await expect(saveHomepageCollection(failed.db,'team-members',null,member,actor,'req','uni-inside')).rejects.toThrow('Simulated collection failure');expect(failed.calls.some(call=>call.sql==='ROLLBACK')).toBe(true);expect(failed.calls.some(call=>call.sql==='COMMIT')).toBe(false);
  });
  it('does not add nonexistent publication columns through the generic API',async()=>{
    const fixture=collectionFixture();await saveHomepageCollection(fixture.db,'partners',null,{name:'Partner',logo_media_id:10,website_url:null,status:'draft'},actor,'req','uni-inside');await content.update(fixture.db,'partners','4',{status:'published'},actor,'publish');expect(fixture.calls.some(call=>call.sql.includes('published_at'))).toBe(false);
  });
  it('keeps generic Team publication under the same plain-text card contract',async()=>{
    const fixture=collectionFixture();
    await saveHomepageCollection(fixture.db,'team-members',null,member,actor,'create','uni-inside');
    await expect(content.update(fixture.db,'team-members','4',{short_bio:'<b>Biography</b>',status:'published'},actor,'publish')).rejects.toMatchObject({status:400,code:'VALIDATION_ERROR'});
    expect(fixture.record()?.status).toBe('draft');
  });
});

describe('About and Team HTTP boundaries',()=>{
  it('requires authentication, permissions, and CSRF',async()=>{
    const fixture=aboutFixture(),app=createApp(config,fixture.db);
    expect((await request(app).get('/api/v1/admin/homepage/about')).status).toBe(401);
    expect((await request(app).patch('/api/v1/admin/homepage/team').set('Cookie',`${config.SESSION_COOKIE_NAME}=session`).send({})).status).toBe(403);
    const denied=createApp(config,aboutFixture('',[]).db);expect((await request(denied).get('/api/v1/admin/homepage/about').set('Cookie',`${config.SESSION_COOKIE_NAME}=session`)).status).toBe(403);
  });
  it('blocks legacy writes and template mutations from lower roles',async()=>{
    const fixture=aboutFixture('',undefined,'editor'),app=createApp(config,fixture.db),token=csrfToken(config,'session'),cookies=[`${config.SESSION_COOKIE_NAME}=session`,`${config.CSRF_COOKIE_NAME}=${token}`];
    for(const path of ['/admin/about-settings/1','/admin/about-workspaces/studio','/admin/about-principles/1','/admin/team-section-settings/1','/admin/homepage-sections/partners'])expect((await request(app).patch(`/api/v1${path}`).set('Cookie',cookies).set('X-CSRF-Token',token).send({heading:'Bypass'})).status).toBe(409);
    expect((await request(app).patch('/api/v1/admin/homepage/team/template').set('Cookie',cookies).set('X-CSRF-Token',token).send({url:'https://canva.link/template'})).status).toBe(403);
    expect(fixture.calls.some(call=>call.sql.includes('card_template_url'))).toBe(false);
  });
});
