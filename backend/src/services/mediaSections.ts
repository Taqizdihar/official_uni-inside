import { HttpError } from '../utils/http';

export const mediaSections = {
  postingan: ['products','services','news'],
  utama: ['team','partners','achievements'],
  lanjutan: ['projects'],
  pengaturan: ['site'],
  administrasi: ['users'],
} as const;
export type MediaSection = keyof typeof mediaSections;
export type MediaContext = (typeof mediaSections)[MediaSection][number];
const rootPattern=/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;
export function validMediaRoot(root:string){
  if(!rootPattern.test(root))throw new HttpError(400,'INVALID_MEDIA_FOLDER','Invalid image root folder.');
  return root;
}
export function sectionForContext(context:string):MediaSection {
  for(const [section,contexts] of Object.entries(mediaSections))
    if((contexts as readonly string[]).includes(context))return section as MediaSection;
  throw new HttpError(400,'VALIDATION_ERROR','Choose a valid media context.');
}
export function resolveMediaDestination(section:MediaSection,context:string|undefined,root:string){
  validMediaRoot(root);
  if(!Object.hasOwn(mediaSections,section))throw new HttpError(400,'VALIDATION_ERROR','Choose a valid section.');
  if(context&&sectionForContext(context)!==section)throw new HttpError(400,'VALIDATION_ERROR','The media context does not match its section.');
  return `${root}/${context||section}`;
}
export function sectionFolders(section:MediaSection,root:string){
  validMediaRoot(root);
  if(!Object.hasOwn(mediaSections,section))throw new HttpError(400,'VALIDATION_ERROR','Choose a valid section.');
  return [`${root}/${section}`,...mediaSections[section].map(context=>`${root}/${context}`)];
}
export function sectionOfFolder(folder:string|null,root:string):MediaSection|null {
  if(!folder||!folder.startsWith(`${validMediaRoot(root)}/`))return null;
  const first=folder.slice(root.length+1).split('/')[0] ?? '';
  if(Object.hasOwn(mediaSections,first))return first as MediaSection;
  try{return sectionForContext(first);}catch{return null;}
}
export function belongsToSection(folder:string|null,section:MediaSection,root:string){
  return sectionOfFolder(folder,root)===section;
}
