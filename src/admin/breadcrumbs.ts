import {catalog,pathFor} from './resources/catalog';

export type Crumb={label:string;to?:string};
const resourceNames:Record<string,string>={
  'team-members':'Anggota Tim',partners:'Mitra','product-categories':'Kategori Produk',
  'service-categories':'Kategori Layanan','news-categories':'Kategori Artikel',
  'product-images':'Galeri Produk','service-images':'Galeri Layanan','news-images':'Gambar Artikel',
  'product-features':'Fitur Produk','product-color-options':'Pilihan Warna Produk',
  'product-variants':'Varian Produk','product-purchase-links':'Tautan Pembelian',
  'service-list-items':'Cakupan Layanan','service-process-steps':'Langkah Layanan',
  'project-images':'Gambar Proyek',projects:'Proyek',news:'Artikel',products:'Produk',services:'Layanan',
  'social-links':'Sosial Media','contact-chat-messages':'Percakapan Kontak',
  'site-settings':'Pengaturan Footer','page-settings':'Pengaturan Halaman',
  'homepage-sections':'Bagian Homepage','hero-settings':'Hero','hero-trust-signals':'Keunggulan Hero',
  'hero-workspaces':'Workspace Hero','hero-hotspots':'Callout Hero',
  'about-settings':'About Us','about-workspaces':'Workspace About Us',
  'about-principles':'Prinsip About Us','team-section-settings':'Our Team',
  'achievement-section-settings':'Pencapaian','contact-section-settings':'Contact Us',
  achievements:'Pencapaian',
};
const labels:Record<string,string>={products:'Produk',services:'Layanan',news:'Artikel'};
const singular:Record<string,string>={products:'Produk',services:'Layanan',news:'Artikel'};
const fixedLabels:Record<string,string>={media_kit:'Media Kit',products:'Produk',services:'Layanan',news:'Artikel',partners:'Mitra',studio:'Studio',craft:'Craft'};
const special:Record<string,string>={
  '/admin/dashboard':'Dashboard','/admin/analytics':'Analitik','/admin/media':'Manajemen Aset',
  '/admin/users':'Manajemen Pengguna','/admin/roles':'Role dan Akses',
  '/admin/audit':'Riwayat Aktivitas','/admin/profile':'Profil Saya',
};

export function resolveBreadcrumb(pathname:string):Crumb[]{
  const root:Crumb={label:'Internal CMS',to:'/admin/dashboard'};
  const path=pathname.replace(/\/$/,'')||'/admin/dashboard';
  if(special[path])return [root,{label:special[path]}];
  const [,admin,group,resource,key]=path.split('/');
  if(admin!=='admin'||!['content','homepage','site'].includes(group)||!catalog[resource])return [root,{label:'Halaman CMS'}];
  const def=catalog[resource];
  const base=pathFor(def);
  const name=resourceNames[resource]??def.label;
  const listLabel=labels[resource]?`Daftar ${labels[resource]}`:name;
  if(!key)return [root,{label:listLabel}];
  const parent:Crumb={label:listLabel,to:base};
  if(key==='new')return [root,parent,{label:`Tambah ${singular[resource]??name}`}];
  const fixed=def.kind==='fixed';
  const keyLabel=fixed?fixedLabels[key]??(key==='1'?def.label:`Detail ${name}`):`Edit ${singular[resource]??name}`;
  return [root,parent,{label:fixed&&key==='1'?name.startsWith('Pengaturan')?name:`Pengaturan ${name}`:keyLabel}];
}
