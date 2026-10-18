export type Media = {id:number;public_id:string;secure_url:string;original_filename:string;alt_text:string|null;caption:string|null;format:string;width_px:number;height_px:number;bytes_size:number;folder_path:string};
export type SignedUpload = {uploadUrl:string;apiKey:string;signature:string;asset_folder:string;public_id_prefix:string;timestamp:number;allowed_formats:string};
export type UploadRequest = <T>(path:string, options?:RequestInit)=>Promise<{data:T}>;

const formats = ['image/jpeg','image/png','image/webp','image/avif'];
export const signedFormFields = ['asset_folder','public_id_prefix','timestamp','allowed_formats','signature'] as const;

export function uploadForm(signed:SignedUpload,file:File) {
  const form = new FormData();
  for (const key of signedFormFields) form.append(key,String(signed[key]));
  form.append('api_key',signed.apiKey);
  form.append('file',file);
  return form;
}

export function validateImage(file:File) {
  if (!formats.includes(file.type) || file.size > 10_000_000 || file.size === 0) {
    throw new Error('Pilih gambar JPG, PNG, WebP, atau AVIF berukuran maksimal 10 MB.');
  }
}

function cloudinaryError(status:number) {
  if (status === 401 || status === 403) return new Error('Cloudinary menolak otorisasi unggahan. Hubungi administrator untuk memeriksa konfigurasi penyimpanan.');
  if (status === 413) return new Error('Cloudinary menolak gambar karena ukurannya terlalu besar. Pilih gambar lain.');
  return new Error('Cloudinary menolak unggahan gambar. Periksa format gambar dan coba lagi.');
}

export async function uploadImage(file:File,scope:string,entity:string|undefined,altText:string,caption:string,onProgress:(value:number)=>void,onXhr:(xhr:XMLHttpRequest|null)=>void,request:UploadRequest,xhrFactory:()=>XMLHttpRequest=()=>new XMLHttpRequest()):Promise<Media> {
  validateImage(file);
  onProgress(0);
  try {
    let signed:SignedUpload;
    try {
      signed=(await request<SignedUpload>('/admin/media/sign-upload',{method:'POST',body:JSON.stringify({scope,entity})})).data;
    } catch {
      throw new Error('Tidak dapat menyiapkan izin unggah dari server CMS. Periksa sesi atau koneksi, lalu coba lagi.');
    }
    const form=uploadForm(signed,file);
    const uploaded=await new Promise<{public_id:string}>((resolve,reject)=>{
      const xhr=xhrFactory();
      onXhr(xhr);
      xhr.open('POST',signed.uploadUrl);
      xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
      xhr.onerror=()=>reject(new Error('Koneksi ke Cloudinary terputus. Periksa jaringan dan coba lagi.'));
      xhr.onabort=()=>reject(new Error('Unggahan gambar dibatalkan.'));
      xhr.onload=()=>{
        if(xhr.status<200||xhr.status>=300){reject(cloudinaryError(xhr.status));return;}
        try {
          const result:unknown=JSON.parse(xhr.responseText);
          if(result&&typeof result==='object'&&'public_id' in result&&typeof result.public_id==='string')resolve({public_id:result.public_id});
          else reject(new Error('Respons Cloudinary tidak valid. Coba unggah lagi.'));
        } catch {reject(new Error('Respons Cloudinary tidak valid. Coba unggah lagi.'));}
      };
      xhr.send(form);
    });
    try {
      return (await request<Media>('/admin/media/finalize',{method:'POST',body:JSON.stringify({scope,entity,publicId:uploaded.public_id,altText:altText||null,caption:caption||null})})).data;
    } catch {
      throw new Error('Gambar terunggah, tetapi tidak dapat disimpan ke Media Library. Hubungi administrator sebelum mencoba lagi.');
    }
  } catch(error) {
    onProgress(0);
    throw error;
  } finally {
    onXhr(null);
  }
}
