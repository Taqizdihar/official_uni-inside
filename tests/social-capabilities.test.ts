import assert from 'node:assert/strict';
import test from 'node:test';
import {getCmsCapabilities} from '../src/admin/api/capabilities';

test('an older backend without a capability route keeps both new features unavailable',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'NOT_FOUND',message:'Route not found.'}}),{status:404,headers:{'content-type':'application/json'}});
  try{const caps=await getCmsCapabilities();assert.equal(caps.socialMediaV2.enabled,false);assert.equal(caps.productVariantMedia.enabled,false);}
  finally{globalThis.fetch=previous;}
});
test('backend outages are not mistaken for an old backend',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'INTERNAL_ERROR',message:'Unavailable'}}),{status:503,headers:{'content-type':'application/json'}});
  try{await assert.rejects(getCmsCapabilities());}
  finally{globalThis.fetch=previous;}
});
