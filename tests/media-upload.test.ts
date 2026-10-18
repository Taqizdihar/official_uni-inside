import assert from 'node:assert/strict';
import test from 'node:test';
import {signedFormFields,uploadForm,uploadImage,validateImage,type SignedUpload,type UploadRequest} from '../src/admin/media/upload';

const signed:SignedUpload={uploadUrl:'https://api.cloudinary.com/v1_1/test-cloud/image/upload',apiKey:'public-key',signature:'short-lived-signature',asset_folder:'uni-inside/site',public_id_prefix:'uni-inside/site',timestamp:1234567890,allowed_formats:'jpg,jpeg,png,webp,avif'};
const file=new File(['image'],'test.png',{type:'image/png'});

class FakeXhr {
  upload:{onprogress:((event:{lengthComputable:boolean;loaded:number;total:number})=>void)|null}={onprogress:null};
  onerror:(()=>void)|null=null;
  onabort:(()=>void)|null=null;
  onload:(()=>void)|null=null;
  sent:FormData|null=null;
  status=200;
  responseText=JSON.stringify({public_id:'uni-inside/site/test'});
  open(method:string,url:string){assert.equal(method,'POST');assert.equal(url,signed.uploadUrl);}
  send(form:FormData){this.sent=form;queueMicrotask(()=>this.onload?.());}
}

test('Cloudinary form contains exactly the signed Upload API fields and no secret',()=>{
  const form=uploadForm(signed,file);
  assert.deepEqual([...form.keys()].sort(),[...signedFormFields,'api_key','file'].sort());
  assert.equal(form.get('max_file_size'),null);
  assert.equal(form.get('api_secret'),null);
  assert.equal(form.get('file'),file);
});

test('rejects unsupported and oversized files before requesting a signature',()=>{
  assert.throws(()=>validateImage(new File(['x'],'test.gif',{type:'image/gif'})),/JPG, PNG/);
  assert.throws(()=>validateImage({type:'image/png',size:10_000_001} as File),/10 MB/);
  assert.throws(()=>validateImage(new File([],'empty.png',{type:'image/png'})),/10 MB/);
});

test('successful upload finalizes only after Cloudinary returns a public ID',async()=>{
  const calls:string[]=[];
  const xhr=new FakeXhr();
  const request:UploadRequest=async <T>(path:string,options?:RequestInit)=>{
    calls.push(path);
    if(path.endsWith('sign-upload'))return {data:signed as T};
    assert.deepEqual(JSON.parse(String(options?.body)),{scope:'site',publicId:'uni-inside/site/test',altText:'Logo',caption:null});
    return {data:{id:7,public_id:'uni-inside/site/test'} as T};
  };
  const result=await uploadImage(file,'site',undefined,'Logo','',()=>{},()=>{},request,()=>xhr as unknown as XMLHttpRequest);
  assert.equal(result.id,7);
  assert.deepEqual(calls,['/admin/media/sign-upload','/admin/media/finalize']);
  assert.equal(xhr.sent?.get('max_file_size'),null);
});

test('Cloudinary rejection is sanitized and clears progress without finalization',async()=>{
  const xhr=new FakeXhr();xhr.status=401;xhr.responseText='{"error":{"message":"api_secret=private-value Invalid Signature"}}';
  const progress:number[]=[];const calls:string[]=[];
  const request:UploadRequest=async <T>(path:string)=>{calls.push(path);return {data:signed as T};};
  await assert.rejects(uploadImage(file,'site',undefined,'','',value=>progress.push(value),()=>{},request,()=>xhr as unknown as XMLHttpRequest),error=>{
    assert.match(String(error),/Cloudinary menolak otorisasi/);
    assert.doesNotMatch(String(error),/private-value|api_secret|Invalid Signature/);
    return true;
  });
  assert.deepEqual(calls,['/admin/media/sign-upload']);
  assert.equal(progress.at(-1),0);
});

test('a network interruption stays distinct from a Cloudinary rejection',async()=>{
  const xhr=new FakeXhr();
  xhr.send=()=>{queueMicrotask(()=>xhr.onerror?.());};
  const request:UploadRequest=async <T>()=>({data:signed as T});
  await assert.rejects(uploadImage(file,'site',undefined,'','',()=>{},()=>{},request,()=>xhr as unknown as XMLHttpRequest),/Koneksi ke Cloudinary terputus/);
});

test('signing and finalization errors have separate messages and clear progress',async()=>{
  const signing:UploadRequest=async()=>{throw new Error('secret-session-token');};
  await assert.rejects(uploadImage(file,'site',undefined,'','',()=>{},()=>{},signing),error=>{
    assert.match(String(error),/menyiapkan izin unggah/);
    assert.doesNotMatch(String(error),/secret-session-token/);
    return true;
  });
  const xhr=new FakeXhr();const progress:number[]=[];
  const finalization:UploadRequest=async <T>(path:string)=>{
    if(path.endsWith('sign-upload'))return {data:signed as T};
    throw new Error('secret-database-detail');
  };
  await assert.rejects(uploadImage(file,'site',undefined,'','',value=>progress.push(value),()=>{},finalization,()=>xhr as unknown as XMLHttpRequest),error=>{
    assert.match(String(error),/tidak dapat disimpan ke Media Library/);
    assert.doesNotMatch(String(error),/secret-database-detail/);
    return true;
  });
  assert.equal(progress.at(-1),0);
});
