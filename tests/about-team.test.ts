import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aboutEditFallback,aboutPreviewDefaults,characterCount,validateAboutEdit,validateAboutPreview,validateTeamMember,validatePartner} from '../backend/src/contracts/aboutTeam';
import {memberIndexForSlot,ringMemberAngle,selectManagedItems,memberProfileLinks,partnerHref,resolveAboutContent} from '../src/public/aboutTeam';
import {resolveBreadcrumb} from '../src/admin/breadcrumbs';
import {catalog,fixedLandingPath} from '../src/admin/resources/catalog';

test('Team fan and ring calculations handle zero, one, two, nine, and larger collections',()=>{
  for(const count of [0,1,2,9,18])for(let slot=-40;slot<=40;slot++){
    const index=memberIndexForSlot(slot,count);assert.ok(count===0?index===null:index!==null&&index>=0&&index<count);
    assert.ok(Number.isFinite(ringMemberAngle(slot,count)));
  }
  assert.equal(memberIndexForSlot(0,9),4);assert.equal(memberIndexForSlot(0,1),0);
});
test('managed Team and Partner rollout preserves the complete static collection until explicit activation',()=>{
  const fallback=Array.from({length:9},(_,id)=>({id})),single=[{id:20}];
  assert.deepEqual(selectManagedItems(false,single,fallback),fallback);
  assert.deepEqual(selectManagedItems(true,single,fallback),single);
  assert.deepEqual(selectManagedItems(true,[],fallback),[]);
  assert.deepEqual(selectManagedItems(true,null,fallback),fallback);
});
test('card backs expose only configured valid individual profiles, and Partner links are optional',()=>{
  assert.deepEqual(memberProfileLinks({full_name:'Member'}),[]);
  assert.deepEqual(memberProfileLinks({linkedin_url:null,instagram_url:'https://www.instagram.com/member',github_url:'https://github.com/',x_url:'javascript:alert(1)'}),[{column:'instagram_url',url:'https://www.instagram.com/member'}]);
  assert.equal(partnerHref(null),null);assert.equal(partnerHref('https://user:pass@example.com'),null);assert.equal(partnerHref('https://example.com'),'https://example.com');
});
test('About live and presentation paths resolve stored copy without truncating or changing fixed identities',()=>{
  const legacy='x'.repeat(180),source={about:{heading:'ARBITRARY',lead_text:legacy,body_text:legacy,workspaces_heading:'Legacy heading',principles_heading:'Legacy principles'},aboutWorkspaces:[{workspace_key:'studio',name:'Changed brand',short_label:'Saved subtitle',description:'Saved description',is_visible:1}],aboutPrinciples:[{slot:1,title:'Saved principle',description:'Saved description'}]};
  const content=resolveAboutContent(source);
  assert.equal(content.edit.intro.subtitle,legacy);assert.equal(content.edit.intro.description,legacy);
  assert.equal(content.edit.ecosystem.workspaces[0].key,'studio');assert.equal(content.edit.ecosystem.workspaces[0].subtitle,'Saved subtitle');
  assert.equal(content.edit.guides.principles[0].heading,'Saved principle');assert.equal(content.editorial.highlight,aboutPreviewDefaults.highlight);
  assert.ok(content.editorial.clients.description.includes('\n\n'));
});
test('shared editor contracts preserve over-limit historical fields and enforce required dynamic card details',()=>{
  const legacy=structuredClone(aboutEditFallback),next=structuredClone(legacy);next.partnersHeading='OUR PARTNERS';assert.deepEqual(validateAboutEdit(next,legacy),[]);
  assert.deepEqual(validateAboutPreview(aboutPreviewDefaults),[]);assert.equal(characterCount('😀'),1);
  assert.ok(validateTeamMember({full_name:'',role_title:'',short_bio:'',photo_media_id:0,status:'draft',linkedin_url:null,instagram_url:null,x_url:null,github_url:null}).length>=4);
  assert.equal(validatePartner({name:'Partner',logo_media_id:10,website_url:null,status:'draft'}).length,0);
});
test('About and Team have canonical dedicated breadcrumbs and legacy fixed resources resolve there',()=>{
  assert.equal(resolveBreadcrumb('/admin/homepage/about-settings').at(-1)?.label,'About Us');
  assert.equal(resolveBreadcrumb('/admin/homepage/team-section-settings').at(-1)?.label,'Our Team');
  for(const resource of ['about-settings','about-workspaces','about-principles'])assert.equal(fixedLandingPath(catalog[resource],[]),'/admin/homepage/about-settings');
  assert.equal(fixedLandingPath(catalog['team-section-settings'],[]),'/admin/homepage/team-section-settings');
});
