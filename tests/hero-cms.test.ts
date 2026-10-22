import {test} from 'node:test';
import assert from 'node:assert/strict';
import {characters,heroCalloutLabels,heroUrlValid,validateHero,type HeroEdit} from '../src/admin/hero/model';
const existing:HeroEdit={headingLine2:'Stories Crafted.',descriptionLine1:'From visual storytelling to physical creation,',descriptionLine2:null,trustSignals:[1,2,3].map(slot=>({slot,numericValue:10,suffix:'+',label:'PROJECTS'})),workspaces:['studio','craft'].map(key=>({key,primaryLabel:'Explore Our Services',primaryUrl:'/services',secondaryLabel:'See Our Work',secondaryUrl:'/projects'})),callouts:heroCalloutLabels.map(([key])=>({key,label:'Callout'}))};
test('Hero form uses ten fixed callout identities and Unicode character limits',()=>{
  assert.equal(heroCalloutLabels.length,10);
  assert.equal(new Set(heroCalloutLabels.map(([key])=>key)).size,10);
  assert.equal(characters('😀'.repeat(14)),14);
  const next=structuredClone(existing);next.trustSignals[0]!.label='😀'.repeat(15);
  assert.equal(validateHero(next,existing,false,{})['trustSignals.0.label'],'Maksimal 14 karakter.');
});
test('Hero form rejects unsafe destinations and overlong callout assembly',()=>{
  assert.equal(heroUrlValid('https://example.com/path'),true);
  assert.equal(heroUrlValid('/services'),true);
  for(const value of ['//example.com','javascript:alert(1)','https://user:pass@example.com','http://example.com'])assert.equal(heroUrlValid(value),false);
  const next=structuredClone(existing);next.callouts[0]!.label='x'.repeat(30);
  assert.equal(validateHero(next,existing,false,{[next.callouts[0]!.key]:'1234567890'.repeat(4)})['callouts.0.label'],'Teks callout lengkap terlalu panjang.');
});
