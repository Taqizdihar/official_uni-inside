export type SectionKind='contact'|'achievements'|'news'|'services'|'products';
export type SectionEdit=Record<string,string>;
export const fields:Record<SectionKind,{key:string;label:string;limit:number;url?:boolean}[]>={
  contact:[{key:'heading',label:'Heading',limit:10},{key:'description',label:'Sub-heading',limit:50}],
  achievements:[{key:'heading',label:'Heading',limit:12},{key:'description',label:'Subtitle',limit:65}],
  news:[{key:'heading',label:'Heading',limit:15},{key:'primary_cta_label',label:'Teks tombol',limit:15},{key:'primary_cta_url',label:'Tujuan Tombol',limit:1000,url:true},{key:'description',label:'Subtitle',limit:50}],
  services:[{key:'heading',label:'Heading',limit:12},{key:'primary_cta_label',label:'Teks tombol',limit:20},{key:'primary_cta_url',label:'Tujuan Tombol',limit:1000,url:true}],
  products:[{key:'description',label:'Subtitle',limit:50},{key:'primary_cta_label',label:'Teks tombol',limit:20},{key:'primary_cta_url',label:'Tujuan Tombol',limit:1000,url:true}],
};
export const length=(value:string)=>Array.from(value).length;
export function validDestination(value:string){if(!value||value!==value.trim()||/\s|\\/u.test(value)||[...value].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||value.startsWith('//'))return false;if(value.startsWith('/'))return true;try{const url=new URL(value);return /^https:\/\//i.test(value)&&url.protocol==='https:'&&!url.username&&!url.password&&Boolean(url.hostname);}catch{return false;}}
export function validateSection(kind:SectionKind,next:SectionEdit,old:SectionEdit){const errors:Record<string,string>={};for(const field of fields[kind]){const value=next[field.key]??'';if(!value.trim())errors[field.key]='Kolom ini wajib diisi.';else if(value!==old[field.key]){if(length(value)>field.limit)errors[field.key]=`Maksimal ${field.limit} karakter.`;else if(field.url&&!validDestination(value))errors[field.key]='Gunakan path internal atau URL HTTPS yang aman.';else if(!field.url&&/[<>\r\n]/u.test(value))errors[field.key]='Gunakan teks biasa tanpa markup atau baris baru.';}}return errors;}
