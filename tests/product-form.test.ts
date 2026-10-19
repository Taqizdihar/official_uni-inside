import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {addPlatform,moveRow,numeric,prepareFeatures,reorderPhotos,saveAction,selectPhoto,validPlatformUrl,type Photo} from '../src/admin/products/model';
const photos:Photo[]=Array.from({length:9},(_,index)=>({id:index+1,secure_url:`https://example.test/${index}.jpg`}));
test('product photos enforce one cover plus eight gallery slots, uniqueness, and cover swapping',()=>{
  let slots:(Photo|null)[]=Array(9).fill(null);
  photos.forEach((photo,index)=>{slots=selectPhoto(slots,index,photo);});
  assert.equal(slots.filter(Boolean).length,9);
  assert.throws(()=>selectPhoto(slots,9,photos[0]));assert.throws(()=>selectPhoto(slots,2,photos[0]));
  const swapped=reorderPhotos(slots,0,3);assert.equal(swapped[0]?.id,4);assert.equal(swapped[3]?.id,1);
  const moved=reorderPhotos(slots,8,1);assert.deepEqual(moved.map(photo=>photo?.id),[1,9,2,3,4,5,6,7,8]);
  assert.deepEqual(slots.map(photo=>photo?.id),[1,2,3,4,5,6,7,8,9]);
});
test('variant and platform ordering preserves row identity and boundary rows',()=>{
  const rows=[{id:1},{id:2},{id:3}];assert.equal(moveRow(rows,0,-1),rows);assert.equal(moveRow(rows,2,3),rows);assert.deepEqual(moveRow(rows,2,0).map(row=>row.id),[3,1,2]);
  const enabled=addPlatform([], 'shopee');assert.equal(addPlatform(enabled,'shopee'),enabled);assert.equal(addPlatform(enabled,'whatsapp').length,2);
});
test('features trim values, ignore blank entry rows, and reject incomplete rows',()=>{
  assert.deepEqual(prepareFeatures([{key:'1',label:' Bahan ',value_text:' PLA '},{key:'2',label:' ',value_text:''}]),[{label:'Bahan',value_text:'PLA'}]);
  assert.throws(()=>prepareFeatures([{key:'1',label:'Bahan',value_text:' '}]),/Lengkapi/);
});
test('platform URLs and numeric inputs reject unsafe or invalid values',()=>{
  assert.ok(validPlatformUrl('https://shopee.co.id/product/1'));assert.ok(!validPlatformUrl('javascript:alert(1)'));assert.ok(!validPlatformUrl('https://user:password@example.test'));
  assert.equal(numeric('','Stok',true),null);assert.equal(numeric('0','Stok',true),0);assert.throws(()=>numeric('1.5','Stok',true));assert.throws(()=>numeric('-1','Harga'));
});
test('the primary save action only requests publish when publication is authorized',()=>{
  assert.equal(saveAction(true,true),'publish');assert.equal(saveAction(true,false),'draft');assert.equal(saveAction(false,true),'draft');
});
