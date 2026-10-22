export const mediaSections=[
  {value:'postingan',label:'Postingan',contexts:['products','services','news']},
  {value:'utama',label:'Halaman Utama',contexts:['team','partners','achievements']},
  {value:'lanjutan',label:'Halaman Lanjutan',contexts:['projects']},
  {value:'pengaturan',label:'Pengaturan',contexts:['site']},
  {value:'administrasi',label:'Administrasi',contexts:['users']},
] as const;
export type MediaSection=(typeof mediaSections)[number]['value'];
export function sectionForContext(context:string):MediaSection{
  return mediaSections.find(section=>(section.contexts as readonly string[]).includes(context))?.value??'pengaturan';
}
export function sectionLabel(section:string){return mediaSections.find(item=>item.value===section)?.label??'Lainnya';}
export function sectionFromFolder(folder:string|null):MediaSection|'lainnya'{
  if(!folder)return 'lainnya';
  const parts=folder.split('/');
  for(const part of parts.slice(1)){
    const section=mediaSections.find(item=>item.value===part||(item.contexts as readonly string[]).includes(part));
    if(section)return section.value;
  }
  return 'lainnya';
}
