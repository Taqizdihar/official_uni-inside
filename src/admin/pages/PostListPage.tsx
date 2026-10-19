import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowDown,ArrowRight,ArrowUp,BriefcaseBusiness,Grid2X2,LayoutList,Newspaper,Package,Plus,Search} from 'lucide-react';
import {api,query} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {Empty,Notice,Pagination} from '../components/Ui';
import {formatDate,statusLabels} from '../copy';
import {catalog,pathFor} from '../resources/catalog';

type Resource='products'|'services'|'news';
type View='grid'|'list';
type Item={id:number;name?:string;title?:string;slug?:string;status?:string;short_description?:string;excerpt?:string;category_id?:number;category_name?:string|null;product_type?:string;content_type?:string;pricing_type?:string;base_price?:number|string|null;starting_price?:number|string|null;currency_code?:string;price_note?:string|null;estimated_duration?:string|null;updated_at?:string;published_at?:string|null;scheduled_at?:string|null;author_name?:string|null;image?:{secure_url:string;alt_text?:string|null}|null};
type Category={id:number;name:string};
const settings={
  products:{title:'Produk',description:'Daftar produk untuk ditampilkan',add:'Tambah Produk',search:'Cari nama produk',category:'product-categories',icon:Package},
  services:{title:'Jasa/Layanan',description:'Daftar jasa/layanan untuk ditampilkan',add:'Tambah Layanan',search:'Cari nama jasa/layanan',category:'service-categories',icon:BriefcaseBusiness},
  news:{title:'Artikel',description:'Daftar artikel untuk ditampilkan',add:'Tambah Artikel',search:'Cari nama artikel',category:'news-categories',icon:Newspaper},
} as const;
const statuses=['draft','scheduled','published','archived'];
const words=(value:unknown)=>typeof value==='string'?value.trim():'';
const displayDate=(value?:string|null)=>{if(!value)return null;const date=new Date(value);return Number.isNaN(date.getTime())?null:formatDate(date);};
function money(value:number|string|null|undefined,currency?:string){if(value===null||value===undefined||value===''||!currency)return null;const amount=Number(value);if(!Number.isFinite(amount)||amount<=0)return null;try{return new Intl.NumberFormat('id-ID',{style:'currency',currency,maximumFractionDigits:0}).format(amount);}catch{return null;}}
function price(item:Item,resource:Resource){const note=words(item.price_note);if(note)return note;if(resource==='services'&&item.pricing_type==='contact')return null;return money(resource==='products'?item.base_price:item.starting_price,item.currency_code);}
function optionsFor(resource:Resource){const field=resource==='products'?'product_type':resource==='news'?'content_type':null;const options=field?catalog[resource].fields.find(item=>item.key===field)?.options??[]:[];return resource==='news'?options.map(([value,label])=>[value,value==='news'?'Berita':label] as [string,string]):options;}
function PostImage({item,resource}:{item:Item;resource:Resource}){const [failed,setFailed]=useState(false);const Icon=settings[resource].icon;return <div className="cms-post-image">{item.image?.secure_url&&!failed?<img src={item.image.secure_url} alt={item.image.alt_text||''} loading="lazy" onError={()=>setFailed(true)}/>:<span className="cms-post-image-fallback"><Icon size={31} strokeWidth={1.5} aria-hidden="true"/><span>Gambar belum tersedia</span></span>}</div>;}
function PostCard({item,resource,view,canEdit}:{item:Item;resource:Resource;view:View;canEdit:boolean}){
  const title=words(item.name??item.title)||`Konten #${item.id}`;
  const detail=words(resource==='news'?item.excerpt:item.short_description);
  const type=resource==='services'?null:optionsFor(resource).find(([value])=>value===(resource==='products'?item.product_type:item.content_type))?.[1];
  const servicePricing=resource==='services'?catalog.services.fields.find(field=>field.key==='pricing_type')?.options?.find(([value])=>value===item.pricing_type)?.[1]:null;
  const amount=price(item,resource);
  const date=displayDate(resource==='news'?(item.status==='scheduled'?item.scheduled_at:item.published_at)||item.updated_at:item.updated_at);
  const href=`${pathFor(catalog[resource])}/${encodeURIComponent(item.id)}`;
  return <article className={`cms-post-card ${view==='list'?'is-list':''}`}>
    <PostImage key={`${item.id}-${item.image?.secure_url??''}`} item={item} resource={resource}/>
    <div className="cms-post-content"><div className="cms-post-labels">{item.status&&statusLabels[item.status]&&<span className={`cms-post-status ${item.status}`}>{statusLabels[item.status]}</span>}{type&&<span className="cms-post-type">{type}</span>}</div><h2><Link to={href}>{title}</Link></h2>{detail&&<p className="cms-post-description">{detail}</p>}<div className="cms-post-facts">{amount&&<strong>{amount}</strong>}{servicePricing&&<span>{servicePricing}</span>}{item.category_name&&<span>{item.category_name}</span>}{resource==='services'&&words(item.estimated_duration)&&<span>{item.estimated_duration}</span>}{resource==='news'&&item.author_name&&<span>{item.author_name}</span>}</div></div>
    <div className="cms-post-bottom">{date&&<span>{resource==='news'&&item.status==='published'?'Terbit':resource==='news'&&item.status==='scheduled'?'Terjadwal':'Diperbarui'} {date}</span>}<Link className="cms-post-open" to={href} aria-label={`${canEdit?'Edit':'Buka'} ${title}`}>{canEdit?'Edit':'Buka'}<ArrowRight size={15} aria-hidden="true"/></Link></div>
  </article>;
}
export function PostListPage({resource}:{resource:Resource}){
  const config=settings[resource],{has}=useAuth(),canView=has(`${resource}.view`),canCreate=has(`${resource}.create`),canEdit=has(`${resource}.update`);
  const [params,setParams]=useSearchParams();
  const [searchInput,setSearchInput]=useState(params.get('search')??'');
  const [items,setItems]=useState<Item[]>([]),[categories,setCategories]=useState<Category[]>([]);
  const [meta,setMeta]=useState({page:1,totalPages:0,total:0});
  const [loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null),[categoryError,setCategoryError]=useState(false);
  const [reload,setReload]=useState(0),[categoryReload,setCategoryReload]=useState(0);
  const [view,setView]=useState<View>(()=>{try{return localStorage.getItem('cms-post-view')==='list'?'list':'grid';}catch{return 'grid';}});
  const page=Math.max(1,Number(params.get('page')??1)||1),search=params.get('search')??'',status=params.get('status')??'',categoryId=params.get('categoryId')??'',type=params.get('type')??'',direction=params.get('direction')==='desc'?'desc':'asc';
  const typeOptions=optionsFor(resource),typeKey=resource==='products'?'productType':resource==='news'?'contentType':null;
  const base=pathFor(catalog[resource]);
  const setParam=(name:string,value:string)=>setParams(current=>{const next=new URLSearchParams(current);if(value)next.set(name,value);else next.delete(name);if(name!=='page')next.delete('page');return next;});
  useEffect(()=>{setSearchInput(search);},[search]);
  useEffect(()=>{if(searchInput===search)return;const timer=setTimeout(()=>setParam('search',searchInput.trim()),300);return()=>clearTimeout(timer);},[searchInput,search]);
  useEffect(()=>{if(!canView)return;const controller=new AbortController();setCategoryError(false);(async()=>{try{const rows:Category[]=[];let next=1,totalPages=1;do{const result=await api<Category[]>(`/admin/${config.category}?${query({page:next,limit:100})}`,{signal:controller.signal});rows.push(...result.data);totalPages=result.meta?.totalPages??1;next++;}while(next<=totalPages&&!controller.signal.aborted);if(!controller.signal.aborted)setCategories(rows);}catch{if(!controller.signal.aborted)setCategoryError(true);}})();return()=>controller.abort();},[canView,config.category,categoryReload]);
  useEffect(()=>{if(!canView)return;const controller=new AbortController();setLoading(true);setError(null);const options={page,limit:20,search:search||undefined,status:status||undefined,categoryId:categoryId||undefined,...(type&&typeKey?{[typeKey]:type}:{}),direction};api<Item[]>(`/admin/${resource}?${query(options)}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setItems(result.data);setMeta({page:result.meta?.page??page,totalPages:result.meta?.totalPages??0,total:result.meta?.total??result.data.length});}}).catch(cause=>{if(!controller.signal.aborted){setItems([]);setError(cause);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[resource,canView,page,search,status,categoryId,type,typeKey,direction,reload]);
  const add=<Link className="cms-button primary cms-post-add" to={`${base}/new`}><Plus size={18} aria-hidden="true"/>{config.add}</Link>;
  const clear=()=>{setSearchInput('');setParams(new URLSearchParams());};
  const chooseView=(value:View)=>{setView(value);try{localStorage.setItem('cms-post-view',value);}catch{/* Continue without saved preference. */}};
  if(!canView)return <div className="cms-page"><div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin untuk melihat {config.title.toLowerCase()}.</div></div>;
  return <div className="cms-page cms-post-page"><div className="cms-page-head"><div><h1>{config.title}</h1><p>{config.description}</p></div>{canCreate&&add}</div>
    <div className="cms-post-toolbar"><div className="cms-search-wrap"><Search size={17} aria-hidden="true"/><input className="cms-search" value={searchInput} onChange={event=>setSearchInput(event.target.value)} aria-label={config.search} placeholder={config.search}/></div><div className="cms-post-filters"><select aria-label="Filter status" value={status} onChange={event=>setParam('status',event.target.value)}><option value="">Status</option>{statuses.map(value=><option key={value} value={value}>{statusLabels[value]}</option>)}</select><select aria-label="Filter kategori" value={categoryId} onChange={event=>setParam('categoryId',event.target.value)}><option value="">Kategori</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select>{typeKey&&<select aria-label="Filter jenis" value={type} onChange={event=>setParam('type',event.target.value)}><option value="">Jenis</option>{typeOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>}<button type="button" className="cms-post-direction" aria-label={`Urutan ${resource==='news'?'ID artikel':'tampil'} ${direction==='asc'?'naik':'turun'}. Ubah ke ${direction==='asc'?'turun':'naik'}.`} title={`Urutan ${resource==='news'?'ID artikel':'tampil'} ${direction==='asc'?'naik':'turun'}`} onClick={()=>setParam('direction',direction==='asc'?'desc':'asc')}>{direction==='asc'?<ArrowUp size={18}/>:<ArrowDown size={18}/>}</button><div className="cms-asset-view" role="group" aria-label="Tampilan konten"><button type="button" aria-label="Tampilan grid" aria-pressed={view==='grid'} onClick={()=>chooseView('grid')}><Grid2X2 size={17}/></button><button type="button" aria-label="Tampilan daftar" aria-pressed={view==='list'} onClick={()=>chooseView('list')}><LayoutList size={17}/></button></div></div></div>
    {categoryError&&<div className="cms-post-category-notice" role="status">Kategori belum dapat dimuat. <button type="button" onClick={()=>setCategoryReload(value=>value+1)}>Coba lagi</button></div>}
    {error?<div className="cms-post-state"><Notice error={error}/><button type="button" className="cms-button secondary" onClick={()=>setReload(value=>value+1)}>Coba lagi</button></div>:loading?<div className="cms-post-grid" role="status" aria-label={`Memuat ${config.title.toLowerCase()}`}><div className="cms-post-skeleton"/><div className="cms-post-skeleton"/><div className="cms-post-skeleton"/></div>:items.length?<><div className={view==='grid'?'cms-post-grid':'cms-post-list'}>{items.map(item=><PostCard key={item.id} item={item} resource={resource} view={view} canEdit={canEdit}/>)}</div><Pagination page={page} totalPages={meta.totalPages} onChange={value=>setParam('page',String(value))}/></>:<div className="cms-post-state"><Empty>{search||status||categoryId||type?'Tidak ada hasil yang cocok dengan pencarian atau filter.':`Belum ada ${config.title.toLowerCase()} yang tersimpan.`}</Empty><div className="cms-actions">{search||status||categoryId||type?<button type="button" className="cms-button secondary" onClick={clear}>Hapus filter</button>:canCreate&&add}</div></div>}
  </div>;
}
