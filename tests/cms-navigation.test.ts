import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {catalog,fixedLandingPath,fixedRecordKey,pathFor} from '../src/admin/resources/catalog';

test('frontend and backend checks use separate TypeScript and Vitest projects',()=>{
  const frontend=JSON.parse(readFileSync('tsconfig.json','utf8'));
  const backend=JSON.parse(readFileSync('backend/tsconfig.json','utf8'));
  const scripts=JSON.parse(readFileSync('backend/package.json','utf8')).scripts;
  assert.ok(frontend.include.every((pattern:string)=>!pattern.startsWith('backend/')));
  assert.ok(backend.include.includes('src/**/*.ts')&&backend.include.includes('scripts/**/*.ts')&&backend.include.includes('tests/**/*.ts'));
  assert.match(scripts.test,/--config vitest\.config\.ts/);
});

test('Hero entries open the unified editor',()=>{
  const hero=catalog['hero-settings'];
  assert.equal(fixedLandingPath(hero,[{id:1,heading_line_1:'Ideas'}]),'/admin/homepage/hero-settings');
  assert.equal(fixedLandingPath(hero,[]),'/admin/homepage/hero-settings');
  assert.equal(fixedRecordKey(catalog['hero-trust-signals'],{slot:2,label:'Products'}),'2');
  assert.equal(fixedRecordKey(catalog['hero-workspaces'],{workspace_key:'craft'}),'craft');
  assert.equal(fixedRecordKey(catalog['hero-hotspots'],{hotspot_key:'studio_camera'}),'studio_camera');
  assert.equal(fixedRecordKey(catalog['about-principles'],{slot:3}),'3');
  assert.equal(fixedRecordKey(catalog['about-workspaces'],{workspace_key:'studio'}),'studio');
  assert.equal(fixedRecordKey(catalog['homepage-sections'],{section_key:'news'}),'news');
});

test('multi-slot fixed resources select an existing editor while dynamic collections retain listings',()=>{
  const callouts=catalog['hero-hotspots'];
  assert.equal(fixedLandingPath(callouts,[{hotspot_key:'studio_camera',label:'Camera'},{hotspot_key:'craft_printer',label:'Printer'}]),'/admin/homepage/hero-settings');
  assert.equal(fixedLandingPath(catalog.products,[{id:1,name:'Product'}]),null);
  assert.equal(pathFor(catalog.products),'/admin/content/products');
  assert.equal(catalog.products.kind,'dynamic');
  assert.equal(catalog['hero-hotspots'].kind,'fixed');
});

test('active CMS resource definitions contain no manual SEO or social-preview inputs',()=>{
  for(const [name,resource] of Object.entries(catalog)){
    assert.equal(resource.fields.some(field=>/^(meta_title|meta_description|default_meta_title|default_meta_description|social_image_media_id|og_image_media_id)$/.test(field.key)),false,`${name} exposes an SEO field`);
  }
  const routes=readFileSync('src/admin/AdminApp.tsx','utf8');
  assert.doesNotMatch(routes,/<Route path="content\/(services|news)\/new"/);
  const navigation=readFileSync('src/admin/layouts/CmsLayout.tsx','utf8');
  assert.doesNotMatch(navigation,/destination\('Uni-Tools'|resource\('uni-tools'/);
});
