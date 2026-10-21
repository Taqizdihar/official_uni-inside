export const categoryTabs = [
  {key:'products',label:'Produk',resource:'product-categories',permission:'products',noun:'produk'},
  {key:'services',label:'Layanan',resource:'service-categories',permission:'services',noun:'layanan'},
  {key:'articles',label:'Artikel',resource:'news-categories',permission:'news',noun:'artikel'},
] as const;

export type CategoryTab = typeof categoryTabs[number];
export type Category = {id:number;name:string;slug:string;description:string|null;is_active:number};
export const categoryTabFor=(value:string|null)=>categoryTabs.find(tab=>tab.key===value);
export const categoryResourceFor=(value:string)=>categoryTabs.find(tab=>tab.resource===value);
export const categoryUrl=(tab:CategoryTab,action?:'create'|'edit',id?:number)=>{
  const params=new URLSearchParams({tab:tab.key});
  if(action==='create')params.set('create','1');
  if(action==='edit'&&id)params.set('edit',String(id));
  return `/admin/content/categories?${params}`;
};
export const categoryPath=(tab:CategoryTab,id?:number)=>`/admin/${tab.resource}${id?`/${id}`:''}`;
export function categoryPayload(name:string,description:string){
  const trimmed=name.trim();
  if(!trimmed)return {error:'Nama kategori wajib diisi.'} as const;
  if(trimmed.length>150)return {error:'Nama kategori maksimal 150 karakter.'} as const;
  if(description.length>1000)return {error:'Deskripsi maksimal 1.000 karakter.'} as const;
  return {data:{name:trimmed,description:description.trim()||null}} as const;
}
