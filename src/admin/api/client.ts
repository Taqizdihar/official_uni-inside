export const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');

export type ApiEnvelope<T> = { data:T; meta?:{page:number;limit:number;total:number;totalPages:number} };
export type ApiIssue = {path?:string;message?:string};
export class ApiError extends Error {
  constructor(public status:number,public code:string,message:string,public requestId?:string,public details:ApiIssue[]=[]){super(message);}
}
let csrfToken = '';
export function setCsrfToken(value:string){csrfToken=value;}
export function clearCsrfToken(){csrfToken='';}
export async function api<T>(path:string,options:RequestInit={}):Promise<ApiEnvelope<T>> {
  const method=(options.method??'GET').toUpperCase();
  const headers=new Headers(options.headers);
  if(options.body && !(options.body instanceof FormData))headers.set('Content-Type','application/json');
  if(!['GET','HEAD'].includes(method) && csrfToken)headers.set('X-CSRF-Token',csrfToken);
  let response:Response;
  try {response=await fetch(`${API_BASE}${path.startsWith('/')?path:`/${path}`}`,{...options,method,headers,credentials:'include'});}
  catch {throw new ApiError(0,'NETWORK_ERROR','Server CMS belum dapat dihubungi. Periksa koneksi dan coba lagi.');}
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401){clearCsrfToken();window.dispatchEvent(new Event('cms:session-expired'));}
    const error=payload.error??{};
    const details=(Array.isArray(error.details)?error.details:[]).map((item:unknown)=>typeof item==='string'?{message:item}:item as ApiIssue);
    throw new ApiError(response.status,error.code??'REQUEST_FAILED',friendlyMessage(error.code,error.message,response.status),error.requestId,details);
  }
  return payload as ApiEnvelope<T>;
}
export function friendlyMessage(code?:string,message?:string,status?:number){
  const known:Record<string,string>={
    CSRF_INVALID:'Verifikasi sesi berakhir. Muat ulang halaman dan coba lagi.',SESSION_EXPIRED:'Sesi Anda berakhir. Silakan masuk kembali.',
    UNAUTHENTICATED:'Silakan masuk untuk melanjutkan.',INVALID_CREDENTIALS:'Email atau kata sandi tidak cocok.',
    TOKEN_INVALID:'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.',WEAK_PASSWORD:'Gunakan kata sandi yang lebih kuat.',
    INVITATION_CONFLICT:'Undangan ini sudah digunakan atau tidak berlaku.',USER_EXISTS:'Email ini sudah terdaftar.',
    LAST_SUPER_ADMIN:'Super Administrator aktif terakhir tidak dapat dinonaktifkan.',INVALID_ROLE:'Role tidak valid.',
    MEDIA_REFERENCED:'Gambar ini masih digunakan. Ganti gambar pada konten terkait terlebih dahulu.',
    INVALID_MEDIA:'Gambar tidak valid atau tidak ditemukan.',INVALID_MEDIA_FOLDER:'Folder gambar tidak valid.',
    INTEGRATION_NOT_CONFIGURED:'Layanan yang diperlukan belum dikonfigurasi.',FEATURED_SLOT_TAKEN:'Slot Homepage ini sudah digunakan layanan lain.',
    CATEGORY_IN_USE:'Kategori ini digunakan oleh konten yang telah terbit.',ALREADY_EXISTS:'Nilai ini sudah digunakan. Coba nama atau slug lain.',
    NOT_READY:'Database belum siap.',FORBIDDEN:'Anda tidak memiliki izin untuk tindakan ini.',
    PUBLISH_INCOMPLETE:'Lengkapi kolom yang wajib diisi sebelum menerbitkan.',VALIDATION_ERROR:'Periksa kolom yang ditandai dan coba lagi.',
    NOT_FOUND:'Konten tidak ditemukan.',ROW_LIMIT:'Batas jumlah item telah tercapai.',INVALID_REFERENCE:'Konten terkait tidak valid.',
    BODY_TOO_LARGE:'Berkas atau data terlalu besar.',INVALID_JSON:'Data permintaan tidak valid.',
  };
  return (code&&known[code]) || (status===403?'Anda tidak memiliki izin untuk tindakan ini.':status===500?'Server mengalami kendala. Coba lagi nanti.':message&&/^[\x00-\x7F]*$/.test(message)?'Permintaan tidak dapat diselesaikan. Coba lagi.':message||'Permintaan tidak dapat diselesaikan.');
}
export function query(values:Record<string,string|number|boolean|undefined|null>){const search=new URLSearchParams();for(const [key,value] of Object.entries(values))if(value!==undefined&&value!==null&&value!=='')search.set(key,String(value));return search.toString();}
