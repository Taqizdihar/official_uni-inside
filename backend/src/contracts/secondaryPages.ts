/** Fixed authoring contract. A column is present only when its meaning matches existing storage. */
import {characterCount,textIssues,type ValidationIssue} from './aboutTeam';
export const secondaryNames=['products','services','news','media-kit','projects'] as const;
export type SecondaryName=typeof secondaryNames[number];
export type SecondaryField={key:string;label:string;limit:number;fallback:string;column?:'heading'|'description'|'primary_cta_label'|'primary_cta_url';multiline?:boolean;optional?:boolean;kind?:'destination';fixedTarget?:string};
export type SecondaryPanel={title:string;description:string;locked?:string;fields:SecondaryField[]};
const field=(key:string,label:string,limit:number,fallback:string,extra:Partial<SecondaryField>={}):SecondaryField=>({key,label,limit,fallback,...extra});
const heading=(limit:number,fallback:string)=>field('heading','Heading utama',limit,fallback,{column:'heading'});
const description=(limit:number,fallback:string)=>field('description','Deskripsi Hero',limit,fallback,{column:'description',multiline:true});
const cta=(headingLimit:number,title:string,copy:string,label:string):SecondaryPanel=>({title:'Call-to-Action',description:'Ajakan penutup dan tujuan tombol.',fields:[field('cta_heading','Heading',headingLimit,title),field('cta_description','Deskripsi',200,copy,{multiline:true}),field('cta_label','Label tombol',25,label,{column:'primary_cta_label'}),field('cta_url','Tujuan tombol',1000,'/#contact-us',{column:'primary_cta_url',kind:'destination'})]});
export const secondarySpecs:Record<SecondaryName,{label:string;pageKey:string;panels:SecondaryPanel[]}>= {
 products:{label:'Products',pageKey:'products',panels:[
  {title:'Hero',description:'Pembuka halaman produk dan banner.',locked:'Uni-Inside Craft · Logo dan artwork tetap',fields:[heading(30,'Objects made'),field('accent','Heading aksen',25,'to be held.'),description(220,'Explore ready-made pieces and custom 3D-printed creations from our workshop. Each published object has its own details and a direct path to the maker or store.')]},
  {title:'Katalog Produk',description:'Katalog tetap menggunakan produk terbit dari Postingan.',fields:[field('listing_heading','Heading katalog',35,'Browse the objects')]},
  cta(60,'Have something particular in mind?','Tell us about your idea for a custom 3D-printed piece. We can discuss the shape, purpose, and next steps together.','Start a conversation')]},
 services:{label:'Services',pageKey:'services',panels:[
  {title:'Hero',description:'Pembuka layanan dengan tujuan scroll tetap.',locked:'Uni-Inside Studio / Services',fields:[heading(30,'Ideas,'),field('accent','Heading aksen',30,'made visible.'),description(220,'Visual production and creative technology shaped around the story you need to tell. Explore our published capabilities, then bring us your brief.'),field('scroll_label','Label tombol scroll',25,'Explore the services',{fixedTarget:'#studio-offerings'})]},
  {title:'Daftar Layanan',description:'Layanan terbit tetap dikelola melalui Postingan.',fields:[field('listing_heading','Heading daftar',35,'Where we can help')]},
  cta(65,'Have a story, challenge, or idea in mind?','Tell us what you are working toward. We can discuss the right creative approach together.','Discuss a brief')]},
 news:{label:'News',pageKey:'news',panels:[
  {title:'Hero',description:'Judul dan deskripsi halaman arsip berita.',locked:'Uni-Inside / News',fields:[heading(45,'Stories from the studio.'),description(120,'News, ideas, and updates collected in one place.')]},
  {title:'Arsip Artikel',description:'Artikel, kategori, dan pagination mengikuti sistem publik.',fields:[field('archive_heading','Heading arsip',35,'More to explore'),field('sidebar_heading','Heading sidebar',25,'Latest News')]}]},
 'media-kit':{label:'Media Kit',pageKey:'media_kit',panels:[
  {title:'Hero Media Kit',description:'Identitas dan navigasi Media Kit.',locked:'MEDIA KIT · Komposisi dua baris tetap',fields:[field('tagline','Tagline',60,'Creative Inside, Impact Outside.'),description(220,'Uni-Inside Studio brings ideas to life through multimedia production and creative technology, while Uni-Inside Craft turns ideas into custom 3D-printed creations.'),field('explore_label','Label tombol utama',25,'Explore the Brand',{fixedTarget:'#brand'}),field('download_label','Label tombol kedua',25,'Download Logos',{fixedTarget:'#downloads'})]},
  {title:'Brand Overview',description:'Satu deskripsi dan satu paragraf pendukung.',locked:'Uni-Inside at a glance',fields:[field('brand_heading','Heading',60,'A shared idea, made visible.'),field('brand_description','Deskripsi',250,'Uni-Inside is a Bandung-based creative technology startup with two connected workspaces: Studio for visual and digital services, and Craft for designed, 3D-printed objects.',{multiline:true}),field('brand_support','Paragraf pendukung',250,'Uni-Inside Studio brings ideas to life through multimedia production and creative technology, while Uni-Inside Craft turns ideas into custom 3D-printed creations.',{multiline:true})]},
  {title:'Two Workspaces',description:'Dua identitas workspace tetap.',locked:'01 / Studio · Uni-Inside Studio | 02 / Craft · Uni-Inside Craft',fields:[field('workspaces_heading','Heading bagian',60,'Different tools. One point of view.'),field('workspaces_description','Deskripsi bagian',180,'Studio and Craft approach ideas through different materials and processes, connected by the same curiosity and care.',{multiline:true}),field('studio_description','Deskripsi Studio',220,'Photography, videography, drone documentation, editing, company profiles, research documentation, and creative digital solutions.',{multiline:true}),field('craft_description','Deskripsi Craft',220,'Ready-made and custom 3D-printed objects, from functional everyday pieces to character models and original designs built from scratch.',{multiline:true})]},
  {title:'Selected Capabilities',description:'Tiga kartu tetap; ilustrasi mengikuti desain publik.',locked:'01 Drone documentation · 02 Creative technology · 03 Custom 3D objects',fields:[field('capabilities_heading','Heading bagian',60,'A few ways ideas take shape.'),field('capabilities_description','Deskripsi bagian',180,'Capability imagery from the Studio and Craft visual libraries—not client case studies.',{multiline:true}),...[
   ['Drone documentation','Aerial capture for stories, research, and documentation.'],['Creative technology','Digital experiments and solutions shaped around an idea.'],['Custom 3D objects','Original models and ready-made pieces made for the physical world.'],
  ].flatMap(([title,detail],index)=>[field(`capability_${index+1}_heading`,`Heading kartu ${index+1}`,35,title!),field(`capability_${index+1}_description`,`Deskripsi kartu ${index+1}`,120,detail!,{multiline:true})])]},
  {title:'Visual Identity & Typography',description:'Dua kelompok penjelasan brand.',locked:'#202121 · #F9D02D · #FFFFFF | Poppins · Anton',fields:[field('identity_heading','Visual Identity — Heading',60,'Color, with purpose.'),field('identity_description','Visual Identity — Deskripsi',180,'A compact palette keeps the work recognizable across screens, printed materials, and physical objects.',{multiline:true}),field('typography_heading','Typography — Heading',60,'Poppins, with a clear voice.'),field('typography_description','Typography — Deskripsi',220,'Poppins is the site’s sans-serif, used for headings, body copy, and interface text. Anton appears as a supporting display style for selected trust figures.',{multiline:true})]},
  {title:'Logo Use & Downloads',description:'Panduan penggunaan; unduhan logo resmi tetap.',locked:'Logo resmi, format, warna, dan nama file tetap',fields:[field('logos_heading','Heading',50,'Keep the artwork clear.'),field('logos_description','Panduan penggunaan logo',300,'Use the supplied marks as they are: preserve their proportions, keep them unobstructed, and choose a high-contrast background. Do not recolor, stretch, rotate, or add effects.',{multiline:true})]},
  {title:'Media & Collaborations',description:'Email mengikuti informasi kontak Footer.',locked:'Media & collaborations · Email dari Footer',fields:[field('contact_heading','Heading',70,'Have an idea to bring inside?'),field('contact_description','Deskripsi',200,'For media inquiries, collaborations, or brand questions, get in touch with the Uni-Inside team.',{multiline:true})]}]},
 projects:{label:'Projects',pageKey:'projects',panels:[{title:'Konten Utama',description:'Pengaturan disiapkan untuk aktivasi berikutnya.',fields:[heading(25,'PROJECTS'),field('description','Deskripsi pengantar',160,'',{column:'description',optional:true,multiline:true})]}]},
};
export const secondaryFields=(name:SecondaryName)=>secondarySpecs[name].panels.flatMap(panel=>panel.fields);
export const supportedSecondaryFields=(name:SecondaryName)=>secondaryFields(name).filter(field=>field.column);
export function safeSecondaryDestination(value:string){
 if(!value||value!==value.trim()||/\s|\\/u.test(value)||Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||value.startsWith('//'))return false;
 if(value.startsWith('/'))return true;
 try{const url=new URL(value);return /^https:\/\//i.test(value)&&!url.username&&!url.password&&Boolean(url.hostname);}catch{return false;}
}
export function validateSecondaryValues(name:SecondaryName,values:Record<string,string>,old:Record<string,string>={},supportedOnly=true):ValidationIssue[]{
 return (supportedOnly?supportedSecondaryFields(name):secondaryFields(name)).flatMap(field=>{
  const value=values[field.key];
  if(typeof value!=='string')return [{path:field.key,message:'Kolom ini wajib diisi.'}];
  if(field.optional&&!value)return [];
  if(!value.trim())return [{path:field.key,message:'Kolom ini wajib diisi.'}];
  if(field.kind==='destination')return value===old[field.key]||characterCount(value)<=field.limit&&safeSecondaryDestination(value)?[]:[{path:field.key,message:'Gunakan path internal atau URL HTTPS yang aman.'}];
  return textIssues(field.key,value,field.limit,old[field.key],Boolean(field.multiline));
 });
}
