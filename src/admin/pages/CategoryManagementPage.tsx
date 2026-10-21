import {useEffect,useRef,useState,type FormEvent, type KeyboardEvent} from 'react';
import {useSearchParams} from 'react-router-dom';
import {FolderOpen,LoaderCircle,Pencil,Plus,Tags,Trash2} from 'lucide-react';
import {api,ApiError} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {CmsModal,ConfirmDialog,Loading,Notice,Pagination,useToast} from '../components/Ui';
import {categoryPath,categoryPayload,categoryTabFor,categoryTabs,categoryUrl,type Category,type CategoryTab} from '../categories/model';
import './category-management.css';

type FormState={tab:CategoryTab;id:number|null;name:string;description:string;initialName:string;initialDescription:string};
const newForm=(tab:CategoryTab,record?:Category):FormState=>({tab,id:record?.id??null,name:record?.name??'',description:record?.description??'',initialName:record?.name??'',initialDescription:record?.description??''});

export function CategoryManagementPage(){
  const {has}=useAuth();
  const [params,setParams]=useSearchParams();
  const permitted=categoryTabs.filter(tab=>has(`${tab.permission}.view`));
  const requested=categoryTabFor(params.get('tab'));
  const tab=requested&&permitted.includes(requested)?requested:permitted[0];
  const [items,setItems]=useState<Category[]>([]);
  const [total,setTotal]=useState(0);
  const [totalPages,setTotalPages]=useState(0);
  const [page,setPage]=useState(1);
  const [reload,setReload]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<unknown>(null);
  const [form,setForm]=useState<FormState|null>(null);
  const [formLoading,setFormLoading]=useState(false);
  const [formError,setFormError]=useState<unknown>(null);
  const [discard,setDiscard]=useState(false);
  const [deleting,setDeleting]=useState<Category|null>(null);
  const [deleteError,setDeleteError]=useState<unknown>(null);
  const [busy,setBusy]=useState(false);
  const {toast,element}=useToast();
  const tabRefs=useRef<(HTMLButtonElement|null)[]>([]);
  const dirty=!!form&&(form.name!==form.initialName||form.description!==form.initialDescription);

  useEffect(()=>{if(tab&&params.get('tab')!==tab.key)setParams({tab:tab.key},{replace:true});},[tab,params,setParams]);
  useEffect(()=>{setPage(1);setItems([]);setTotal(0);setError(null);},[tab?.key]);
  useEffect(()=>{
    if(!tab)return;
    const controller=new AbortController();
    setLoading(true);setError(null);
    void api<Category[]>(`${categoryPath(tab)}?page=${page}&limit=24&sort=id&direction=desc`,{signal:controller.signal})
      .then(result=>{if(controller.signal.aborted)return;setItems(result.data);setTotal(result.meta?.total??result.data.length);setTotalPages(result.meta?.totalPages??1);})
      .catch(reason=>{if(!controller.signal.aborted){setItems([]);setError(reason);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[tab,page,reload]);

  const createRequested=params.get('create')==='1';
  const editRequested=params.get('edit');
  useEffect(()=>{
    if(!tab)return;
    if(!createRequested&&!editRequested){setForm(null);setFormError(null);setFormLoading(false);setDiscard(false);return;}
    if(createRequested){if(form?.tab!==tab||form.id!==null)setForm(newForm(tab));setFormError(null);setFormLoading(false);return;}
    if(!editRequested)return;
    const id=Number(editRequested);
    if(!Number.isSafeInteger(id)||id<=0){setFormError(new ApiError(400,'VALIDATION_ERROR','Kategori yang diminta tidak valid.'));return;}
    if(form?.tab===tab&&form.id===id)return;
    const controller=new AbortController();
    setFormLoading(true);setFormError(null);
    void api<Category>(categoryPath(tab,id),{signal:controller.signal})
      .then(result=>{if(!controller.signal.aborted)setForm(newForm(tab,result.data));})
      .catch(reason=>{if(!controller.signal.aborted)setFormError(reason);})
      .finally(()=>{if(!controller.signal.aborted)setFormLoading(false);});
    return()=>controller.abort();
  },[tab,createRequested,editRequested,form?.tab,form?.id]);

  function closeForm(force=false){if(busy)return;if(!force&&dirty){setDiscard(true);return;}setDiscard(false);setForm(null);setFormError(null);if(tab)setParams({tab:tab.key},{replace:true});}
  function changeTab(next:CategoryTab){setForm(null);setFormError(null);setDiscard(false);setPage(1);setParams({tab:next.key});}
  function onTabKey(event:KeyboardEvent<HTMLButtonElement>,index:number){
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?permitted.length-1:(index+(event.key==='ArrowRight'?1:-1)+permitted.length)%permitted.length;
    changeTab(permitted[next]!);requestAnimationFrame(()=>tabRefs.current[next]?.focus());
  }
  async function save(event:FormEvent){
    event.preventDefault();if(!form||busy)return;
    const payload=categoryPayload(form.name,form.description);
    if('error'in payload){setFormError(new ApiError(400,'VALIDATION_ERROR',payload.error));return;}
    if(!has(`${form.tab.permission}.${form.id===null?'create':'update'}`)){setFormError(new ApiError(403,'FORBIDDEN','Anda tidak memiliki izin untuk tindakan ini.'));return;}
    setBusy(true);setFormError(null);
    try{
      const result=await api<Category>(categoryPath(form.tab,form.id??undefined),{method:form.id===null?'POST':'PATCH',body:JSON.stringify(payload.data)});
      if(form.id===null){setPage(1);setItems(current=>[result.data,...current.filter(item=>item.id!==result.data.id)].slice(0,24));setTotal(value=>value+1);}
      else setItems(current=>current.map(item=>item.id===form.id?result.data:item));
      setReload(value=>value+1);setForm(null);setDiscard(false);setParams({tab:form.tab.key},{replace:true});
      toast(form.id===null?'Kategori berhasil ditambahkan.':'Perubahan kategori berhasil disimpan.');
    }catch(reason){setFormError(reason instanceof ApiError&&reason.code==='ALREADY_EXISTS'?new ApiError(reason.status,reason.code,'Nama ini menghasilkan alamat kategori yang sudah digunakan. Coba nama lain.',reason.requestId,reason.details):reason);}finally{setBusy(false);}
  }
  async function remove(){
    if(!tab||!deleting||busy)return;
    if(!has(`${tab.permission}.archive`)){setDeleteError(new ApiError(403,'FORBIDDEN','Anda tidak memiliki izin untuk tindakan ini.'));return;}
    setBusy(true);setDeleteError(null);
    try{await api(categoryPath(tab,deleting.id),{method:'DELETE'});setItems(current=>current.filter(item=>item.id!==deleting.id));setTotal(value=>Math.max(0,value-1));if(items.length===1&&page>1)setPage(page-1);setDeleting(null);setReload(value=>value+1);toast('Kategori berhasil dihapus.');}
    catch(reason){setDeleteError(reason);}finally{setBusy(false);}
  }

  if(!tab)return <div className="cms-page"><div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin untuk melihat kategori.</div></div>;
  const canCreate=has(`${tab.permission}.create`);
  const canUpdate=has(`${tab.permission}.update`);
  const canDelete=has(`${tab.permission}.archive`);
  return <div className="cms-page cms-categories">
    <div className="cms-page-head"><div><h1>Manajemen Kategori</h1><p>Kelola kategori untuk produk, layanan, dan artikel.</p></div></div>
    <div role="tablist" aria-label="Jenis kategori" className="cms-category-tabs">{permitted.map((choice,index)=><button key={choice.key} ref={node=>{tabRefs.current[index]=node;}} type="button" role="tab" id={`category-tab-${choice.key}`} aria-controls="category-panel" aria-selected={choice===tab} tabIndex={choice===tab?0:-1} className={`cms-category-tab ${choice===tab?'active':''}`} onClick={()=>changeTab(choice)} onKeyDown={event=>onTabKey(event,index)}>{choice.label}</button>)}</div>
    <section role="tabpanel" id="category-panel" aria-labelledby={`category-tab-${tab.key}`} tabIndex={0}>
      <div className="cms-category-summary"><div className="cms-category-summary-icon"><Tags size={27} aria-hidden="true"/></div><div><h2>Kategori {tab.label}</h2><p>{loading?'Memuat jumlah kategori…':error?'Jumlah kategori belum tersedia.':`${total} kategori tersedia`}</p></div>{canCreate&&<button type="button" className="cms-button primary cms-category-add" onClick={()=>setParams(new URLSearchParams(categoryUrl(tab,'create').split('?')[1]))}><Plus size={18} aria-hidden="true"/>Tambah Kategori</button>}</div>
      {error?<div className="cms-category-feedback"><Notice error={error}/><button type="button" className="cms-button secondary" onClick={()=>setReload(value=>value+1)}>Coba lagi</button></div>:loading?<Loading/>:items.length?<><div className="cms-category-grid">{items.map(item=><article className="cms-category-card" key={item.id}><div className="cms-category-card-icon"><FolderOpen size={23} aria-hidden="true"/></div><h3>{item.name}</h3><p className={item.description?'':'cms-category-placeholder'} title={item.description??undefined}>{item.description||'Belum ada deskripsi.'}</p><div className="cms-category-card-actions">{canUpdate&&<button type="button" className="cms-button secondary" onClick={()=>setParams(new URLSearchParams(categoryUrl(tab,'edit',item.id).split('?')[1]))}><Pencil size={16} aria-hidden="true"/>Edit<span className="cms-sr-only"> {item.name}</span></button>}{canDelete&&<button type="button" className="cms-button cms-category-delete" onClick={()=>{setDeleteError(null);setDeleting(item);}}><Trash2 size={16} aria-hidden="true"/>Hapus<span className="cms-sr-only"> {item.name}</span></button>}</div></article>)}</div>{totalPages>1&&<Pagination page={page} totalPages={totalPages} onChange={setPage}/>}</>:<div className="cms-category-empty"><Tags size={32} aria-hidden="true"/><h3>Belum ada kategori {tab.noun}.</h3><p>Tambahkan kategori pertama agar anggota tim lebih mudah mengelompokkan {tab.noun}.</p>{canCreate&&<button type="button" className="cms-button primary" onClick={()=>setParams(new URLSearchParams(categoryUrl(tab,'create').split('?')[1]))}><Plus size={18} aria-hidden="true"/>Tambah Kategori</button>}</div>}
    </section>
    {(form||formLoading||editRequested&&formError)&&<CmsModal title={discard?'Buang perubahan?':form?.id?`Edit Kategori ${form.tab.label}`:`Tambah Kategori ${tab.label}`} kind={discard?'confirmation':'information'} icon={Tags} busy={busy} onClose={()=>closeForm()} className="cms-category-modal" actions={discard?<><button type="button" className="cms-button secondary" onClick={()=>setDiscard(false)}>Tetap mengedit</button><button type="button" className="cms-button danger" onClick={()=>closeForm(true)}>Buang perubahan</button></>:form?<><button type="button" className="cms-button secondary" disabled={busy} onClick={()=>closeForm()}>Batalkan</button><button type="submit" form="category-form" className="cms-button primary" disabled={busy||!has(`${form.tab.permission}.${form.id===null?'create':'update'}`)}>{busy?<LoaderCircle size={17} className="cms-spin" aria-hidden="true"/>:null}{busy?'Menyimpan…':'Simpan Kategori'}</button></>:<button type="button" className="cms-button secondary" onClick={()=>closeForm(true)}>Tutup</button>}>
      {discard?<p>Perubahan pada kategori ini belum disimpan. Yakin ingin membuangnya?</p>:formLoading?<Loading/>:form?<form id="category-form" onSubmit={event=>void save(event)}><p className="cms-category-modal-intro">{form.id?`Perbarui nama dan deskripsi kategori “${form.initialName}”.`:`Buat kategori baru untuk ${form.tab.noun}.`}</p><div className="cms-field"><label htmlFor="category-name">Nama Kategori</label><input id="category-name" autoFocus required maxLength={150} value={form.name} placeholder="Contoh: Desain Grafis" onChange={event=>{setForm(current=>current?{...current,name:event.target.value}:current);setFormError(null);}}/></div><div className="cms-field"><label htmlFor="category-description">Deskripsi (Opsional)</label><textarea id="category-description" maxLength={1000} value={form.description} placeholder="Jelaskan secara singkat kategori ini (opsional)" onChange={event=>{setForm(current=>current?{...current,description:event.target.value}:current);setFormError(null);}}/><small>{form.description.length}/1.000 karakter</small></div><Notice error={formError}/></form>:<Notice error={formError}/>}
    </CmsModal>}
    {deleting&&<ConfirmDialog title="Hapus kategori?" confirmLabel="Hapus Kategori" cancelLabel="Batalkan" busy={busy} onCancel={()=>{setDeleting(null);setDeleteError(null);}} onConfirm={()=>void remove()} icon={Trash2}><p>Kategori “{deleting.name}” akan dihapus. Tindakan ini tidak dapat dibatalkan.</p><p>Jika masih digunakan oleh konten, kategori tidak dapat dihapus.</p><Notice error={deleteError}/></ConfirmDialog>}
    {element}
  </div>;
}
