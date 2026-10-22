import assert from 'node:assert/strict';
import test from 'node:test';
import {addFooterAccount,moveFooterAccount,placementsFor,removeFooterAccount,validMapsEmbed,validateFooterFields} from '../src/admin/footer/model';
import {resolveBreadcrumb} from '../src/admin/breadcrumbs';
import {catalog} from '../src/admin/resources/catalog';

test('Footer route has one dedicated breadcrumb and content editors omit global order',()=>{
  assert.deepEqual(resolveBreadcrumb('/admin/site/footer').map(crumb=>crumb.label),['Internal CMS','Pengaturan Footer']);
  for(const resource of ['products','services','news'])assert.equal(catalog[resource].fields.some(field=>field.key==='sort_order'),false);
  assert.equal(catalog['product-variants'].fields.some(field=>field.key==='sort_order'),true);
});
test('Footer account placements enforce unique IDs, active accounts and a ten-account limit',()=>{
  const first=addFooterAccount([],{id:4,is_active:1});
  assert.deepEqual(first,[4]);
  assert.throws(()=>addFooterAccount(first,{id:4,is_active:1}));
  assert.throws(()=>addFooterAccount(first,{id:5,is_active:0}));
  assert.deepEqual(placementsFor(Array.from({length:10},(_,i)=>i+1)).at(-1),{social_link_id:10,position:10});
  assert.throws(()=>placementsFor(Array.from({length:11},(_,i)=>i+1)));
});
test('Footer placement order is independent and removable',()=>{
  const original=[11,12,13];assert.deepEqual(moveFooterAccount(original,2,0),[13,11,12]);assert.deepEqual(original,[11,12,13]);
  assert.deepEqual(removeFooterAccount(original,12),[11,13]);
});
test('Footer fields and Google Maps preview URLs are validated',()=>{
  assert.deepEqual(validateFooterFields({footer_description:' Test ',public_email:' team@example.com ',public_phone:'+62 812-3456',address_text:' Bandung '}),{footer_description:'Test',public_email:'team@example.com',public_phone:'+62 812-3456',address_text:'Bandung'});
  assert.throws(()=>validateFooterFields({footer_description:'x'.repeat(1001),public_email:null,public_phone:null,address_text:null}));
  assert.equal(validMapsEmbed('https://www.google.com/maps/embed?pb=test'),'https://www.google.com/maps/embed?pb=test');
  for(const value of ['javascript:alert(1)','https://evil.example/maps/embed?pb=x','https://www.google.com/maps?x=1','https://user:pass@www.google.com/maps/embed?pb=x','https://www.google.com/maps/embed?pb=x&redirect=https://evil.example','<iframe src="https://www.google.com/maps/embed?pb=x">'])assert.equal(validMapsEmbed(value),null);
});
