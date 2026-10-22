import {test} from 'node:test';
import assert from 'node:assert/strict';
import {characters,heroCalloutLabels,heroUrlValid,validateHero,type HeroEdit} from '../src/admin/hero/model';
const existing:HeroEdit={headingLine1:'Ideas',headingLine2:'Stories Crafted.',descriptionLine1:'From visual storytelling to physical creation,',descriptionLine2:null,trustSignals:[1,2,3].map(slot=>({slot,numericValue:10,suffix:'+',label:'PROJECTS'})),workspaces:['studio','craft'].map(key=>({key,primaryLabel:'Explore Our Services',primaryUrl:'/services',secondaryLabel:'See Our Work',secondaryUrl:'/projects'})),callouts:heroCalloutLabels.map(([key])=>({key,label:'Callout'}))};
test('Hero form uses ten fixed callout identities and Unicode character limits',()=>{
  assert.equal(heroCalloutLabels.length,10);
  assert.equal(new Set(heroCalloutLabels.map(([key])=>key)).size,10);
  assert.equal(characters('😀'.repeat(14)),14);
  const next=structuredClone(existing);next.trustSignals[0]!.label='😀'.repeat(15);
  assert.equal(validateHero(next,existing,false)['trustSignals.0.label'],'Maksimal 14 karakter.');
});
test('Hero form rejects unsafe destinations and overlong complete callout lines',()=>{
  assert.equal(heroUrlValid('https://example.com/path'),true);
  assert.equal(heroUrlValid('/services'),true);
  for(const value of ['//example.com','javascript:alert(1)','https://user:pass@example.com','http://example.com'])assert.equal(heroUrlValid(value),false);
  const next=structuredClone(existing);next.callouts[0]!.label='50+ '+ 'x'.repeat(27);
  assert.equal(validateHero(next,existing,false)['callouts.0.label'],'Maksimal 30 karakter.');
});
test('Hero form accepts nine characters after the fixed Ideas prefix, including spaces',()=>{
  const next=structuredClone(existing);next.headingLine1='Ideas123456789';
  assert.equal(validateHero(next,existing,false).headingLine1,undefined);
  next.headingLine1='Ideas 12345678';assert.equal(validateHero(next,existing,false).headingLine1,undefined);
  next.headingLine1='Ideas 123456789';assert.equal(validateHero(next,existing,false).headingLine1,'Maksimal 9 karakter setelah Ideas.');
  next.headingLine1='Hello';assert.equal(validateHero(next,existing,false).headingLine1,'Judul baris 1 harus diawali dengan Ideas.');
});
