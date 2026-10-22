import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fields,validateSection,validDestination,type SectionKind} from '../src/admin/homepage/model';
import {linkDestinations} from '../backend/src/services/linkDestinations';

test('all five Homepage editors use the approved limits and preserve unchanged legacy text',()=>{
  const expected:Record<SectionKind,number[]>={contact:[10,50],achievements:[12,65],news:[15,15,1000,50],services:[12,20,1000],products:[50,20,1000]};
  for(const name of Object.keys(expected) as SectionKind[]){assert.deepEqual(fields[name].map(item=>item.limit),expected[name]);const old=Object.fromEntries(fields[name].map(item=>[item.key,item.url?'/news':'Legacy']));assert.deepEqual(validateSection(name,old,old),{});}
  const old={heading:'NEWS & STORIES',description:'x'.repeat(76),primary_cta_label:'SEE ALL',primary_cta_url:'/news'};
  assert.deepEqual(validateSection('news',{...old,heading:'Studio News'},old),{});
  assert.equal(validateSection('news',{...old,description:'y'.repeat(51)},old).description,'Maksimal 50 karakter.');
  assert.equal(validateSection('contact',{heading:'😀'.repeat(11),description:'Connected'},{heading:'CONTACT US',description:'Connected'}).heading,'Maksimal 10 karakter.');
});
test('button destinations match real public paths and Homepage anchors',()=>{
  const routes=readFileSync('src/main.tsx','utf8'),app=readFileSync('src/App.tsx','utf8'),story=readFileSync('src/components/ScrollStory.tsx','utf8'),products=readFileSync('src/components/ProductsSection.tsx','utf8');
  assert.equal(new Set(linkDestinations.map(item=>item.url)).size,linkDestinations.length);
  for(const {url} of linkDestinations){assert.equal(validDestination(url),true);assert.equal(url.startsWith('/admin'),false);if(url.includes('#')){const anchor=url.split('#')[1];assert.ok([app,story,products].some(source=>source.includes(`id="${anchor}"`)),url);}else assert.ok(routes.includes(`path="${url}"`),url);}
  for(const unsafe of ['//example.com','javascript:alert(1)','data:text/html,x','http://example.com','https://u:p@example.com'])assert.equal(validDestination(unsafe),false);
});
