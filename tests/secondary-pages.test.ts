import {test} from 'node:test';
import assert from 'node:assert/strict';
import {secondaryNames,secondarySpecs,secondaryFields,validateSecondaryValues} from '../backend/src/contracts/secondaryPages';
import {resolveSecondaryContent,footerEmail} from '../src/public/secondaryPageModel';
import {resolveBreadcrumb} from '../src/admin/breadcrumbs';
test('public secondary content binds only stored supported values with safe fallbacks',()=>{
 const content=resolveSecondaryContent('products',[{page_key:'products',heading:'Stored main',description:'Stored description',primary_cta_label:'Stored label',primary_cta_url:'https://example.com'}]);assert.deepEqual({heading:content.heading,description:content.description,cta_label:content.cta_label,cta_url:content.cta_url},{heading:'Stored main',description:'Stored description',cta_label:'Stored label',cta_url:'https://example.com'});
 assert.equal(resolveSecondaryContent('services',[{page_key:'services',primary_cta_url:'javascript:alert(1)'}]).cta_url,'/#contact-us');assert.equal(resolveSecondaryContent('news',undefined).heading,'Stories from the studio.');
 assert.equal(resolveSecondaryContent('media-kit',[{page_key:'media_kit',heading:'Cannot replace MEDIA KIT',description:'Stored'}]).description,'Stored');assert.equal(resolveSecondaryContent('media-kit',[]).heading,undefined);
});
test('secondary breadcrumbs distinguish News from its Homepage editor',()=>{
 for(const name of secondaryNames)assert.notEqual(resolveBreadcrumb(`/admin/secondary/${name}`).at(-1)?.label,'Halaman CMS');assert.notEqual(resolveBreadcrumb('/admin/secondary/news').at(-1)?.label,resolveBreadcrumb('/admin/homepage/news').at(-1)?.label);
});
test('all secondary field limits preserve legacy values and fixed sections',()=>{
 for(const name of secondaryNames){const values=Object.fromEntries(secondaryFields(name).map(field=>[field.key,field.fallback]));assert.equal(validateSecondaryValues(name,values,values,false).length,0);}
 assert.equal(secondarySpecs['media-kit'].panels.length,7);assert.equal(secondarySpecs.projects.panels[0].fields[1].optional,true);
});
test('Media Kit contact destinations reuse safe Footer email',()=>{assert.equal(footerEmail('studio@example.com'),'studio@example.com');assert.equal(footerEmail('a@example.com\nBcc:bad'),'uninsidemed@gmail.com');});
