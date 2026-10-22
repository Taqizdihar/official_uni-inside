import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {accountChanges,accountSuffix,canAddAccount,completeLabel,filteredPlatforms,groupLegacyAccount,nextTabIndex,platformCodes,safeAccountHref,validateAccountUrl} from '../src/admin/social/model';
import {platformCatalog,platformIcons} from '../src/admin/social/platformCatalog';

test('every selectable platform has an explicit renderable brand icon',()=>{
  assert.equal(platformCatalog.length,12);
  for(const code of platformCodes){assert.equal(typeof platformIcons[code],'function');assert.match(renderToStaticMarkup(React.createElement(platformIcons[code])),/<svg/);}
});
test('legacy account codes group by platform without changing their labels or identifiers',()=>{
  const values=['instagram_studio','instagram_craft','tiktok_studio','tiktok_craft','linkedin'];
  const mapped=values.map((platform_code,id)=>groupLegacyAccount({id:id+1,platform_code,label:`Label ${id}`,url:'https://example.test',is_active:1,sort_order:id}));
  assert.deepEqual(mapped.map(item=>item?.canonical_code),['instagram','instagram','tiktok','tiktok','linkedin']);
  assert.equal(mapped[0]?.label,'Label 0');assert.equal(mapped[0]?.id,1);
  assert.equal(groupLegacyAccount({id:9,platform_code:'unsupported',label:'Other',url:'',is_active:1,sort_order:0}),null);
});
test('catalog search and tab keyboard movement are predictable',()=>{
  assert.deepEqual(filteredPlatforms(platformCatalog,' tik ').map(item=>item.platform_code),['tiktok']);
  assert.equal(nextTabIndex('ArrowRight',2,3),0);assert.equal(nextTabIndex('ArrowLeft',0,3),2);
  assert.equal(nextTabIndex('Home',2,3),0);assert.equal(nextTabIndex('End',0,3),2);
});
test('platform limits are independent and editing remains possible at five',()=>{
  assert.equal(canAddAccount(4),true);assert.equal(canAddAccount(5),false);
  const counts={instagram:5,tiktok:2};assert.equal(canAddAccount(counts.instagram),false);assert.equal(canAddAccount(counts.tiktok),true);
});
test('locked platform prefix and editable suffix obey the database length',()=>{
  assert.equal(accountSuffix('Instagram — Uni-Inside Studio','instagram'),'Uni-Inside Studio');
  assert.equal(completeLabel('instagram',' Akun Utama '),'Instagram - Akun Utama');
  assert.throws(()=>completeLabel('instagram',' '));assert.throws(()=>completeLabel('instagram','Instagram - Akun Utama'));
  assert.throws(()=>completeLabel('instagram','x'.repeat(90)));
});
test('editing a historical account URL leaves its stored label untouched',()=>{
  const original={id:5,platform_code:'linkedin',canonical_code:'linkedin' as const,platform_name:'LinkedIn',label:'LinkedIn',url:'https://www.linkedin.com/company/uni-inside/',description:null,is_active:1,sort_order:40};
  const changed=accountChanges('linkedin',{suffix:'LinkedIn',description:'',url:'https://www.linkedin.com/company/uni-inside-new/'},original);
  assert.equal(changed.label,'LinkedIn');assert.deepEqual(changed.body,{url:'https://www.linkedin.com/company/uni-inside-new/'});
});
test('social account URLs require a direct HTTPS platform domain',()=>{
  assert.equal(validateAccountUrl(' https://www.instagram.com/uniinside.id/ ','instagram'),'https://www.instagram.com/uniinside.id/');
  assert.equal(validateAccountUrl('https://wa.me/628123456789','whatsapp'),'https://wa.me/628123456789');
  for(const value of ['javascript:alert(1)','data:text/html,x','http://instagram.com/account','https://instagram.com.evil.test/u','https://user:pass@instagram.com/u','https://instagram.com/redirect?url=https://evil.test'])assert.throws(()=>validateAccountUrl(value,'instagram'));
  assert.throws(()=>validateAccountUrl('https://wa.me/not-a-number','whatsapp'));
  assert.equal(safeAccountHref('javascript:alert(1)','instagram'),null);
  assert.equal(safeAccountHref('https://www.instagram.com/uniinside.id/','instagram'),'https://www.instagram.com/uniinside.id/');
});
