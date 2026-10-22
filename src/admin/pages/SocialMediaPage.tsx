import {useEffect,useMemo,useRef,useState,type FormEvent, type KeyboardEvent} from 'react';
import {Link,useBeforeUnload} from 'react-router-dom';
import {ExternalLink,Plus,Search} from 'lucide-react';
import {api,type ApiError} from '../api/client';
import {getCmsCapabilities,type CmsCapabilities} from '../api/capabilities';
import {useAuth} from '../auth/AuthProvider';
import {CmsModal,ConfirmDialog,Empty,Loading,Notice,useToast} from '../components/Ui';
import {setEditorDirty} from '../dirty';
import {accountChanges,accountSuffix,canAddAccount,filteredPlatforms,groupLegacyAccount,nextTabIndex,platformNames,safeAccountHref,type AccountDraft,type LegacyAccount,type PlatformCode,type SocialAccount,type SocialPlatform} from '../social/model';
import {platformCatalog,PlatformIcon} from '../social/platformCatalog';
import './social-media.css';

type Editor={platform:PlatformCode;account?:SocialAccount};
const emptyDraft:AccountDraft={suffix:'',description:'',url:''};
const errorMessage=(error:unknown)=>{
  const code=(error as ApiError)?.code;
  if(code==='ACCOUNT_LIMIT')return 'Batas maksimal lima akun untuk platform ini telah tercapai.';
  if(code==='ACCOUNT_REFERENCED')return 'Akun ini masih digunakan pada produk. Ganti akun pada produk terkait sebelum menghapusnya.';
  if(code==='INVALID_ACCOUNT_URL')return 'URL akun tidak valid. Periksa kembali alamat yang dimasukkan.';
  if(code==='FEATURE_UNAVAILABLE')return 'Fitur penyimpanan Sosial Media sedang disiapkan dan belum tersedia.';
  return (error as Error)?.message||'Perubahan belum tersimpan. Coba lagi.';
};

export function SocialMediaPage(){
  const {has}=useAuth(),canView=has('settings.view'),canEdit=has('settings.update');
  const [capabilities,setCapabilities]=useState<CmsCapabilities|null>(null),[accounts,setAccounts]=useState<SocialAccount[]>([]),[platforms,setPlatforms]=useState<SocialPlatform[]>([]),[unsupported,setUnsupported]=useState<LegacyAccount[]>([]);
  const [selected,setSelected]=useState<PlatformCode>('instagram'),[previewTab,setPreviewTab]=useState<PlatformCode|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null),[retry,setRetry]=useState(0);
  const [picker,setPicker]=useState(false),[search,setSearch]=useState(''),[editor,setEditor]=useState<Editor|null>(null),[draft,setDraft]=useState<AccountDraft>(emptyDraft),[dirty,setDirty]=useState(false),[discard,setDiscard]=useState(false),[deleting,setDeleting]=useState<SocialAccount|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
  const [toggling,setToggling]=useState<number|null>(null);
  const tabs=useRef<Record<string,HTMLButtonElement|null>>({});const {toast,element:toastElement}=useToast();
  const enabled=capabilities?.socialMediaV2.enabled===true;
  useBeforeUnload(event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  useEffect(()=>{setEditorDirty(dirty);return()=>setEditorDirty(false);},[dirty]);
  useEffect(()=>{
    if(!canView){setLoading(false);return;}
    const controller=new AbortController();setLoading(true);setError(null);
    (async()=>{
      try{
        const caps=await getCmsCapabilities(controller.signal);
        if(controller.signal.aborted)return;setCapabilities(caps);
        if(caps.socialMediaV2.enabled){
          const [types,records]=await Promise.all([api<SocialPlatform[]>('/admin/social-media/platforms',{signal:controller.signal}),api<SocialAccount[]>('/admin/social-media/accounts',{signal:controller.signal})]);
          if(!controller.signal.aborted){setPlatforms(types.data);setAccounts(records.data);setUnsupported(records.data.filter(item=>!platformCatalog.some(platform=>platform.platform_code===item.canonical_code)));}
        }else{
          const all:LegacyAccount[]=[];let page=1,totalPages=1;
          do{const result=await api<LegacyAccount[]>(`/admin/social-links?page=${page}&limit=100`,{signal:controller.signal});all.push(...result.data);totalPages=result.meta?.totalPages??1;page++;}while(page<=totalPages&&!controller.signal.aborted);
          if(!controller.signal.aborted){setAccounts(all.flatMap(item=>{const mapped=groupLegacyAccount(item);return mapped?[mapped]:[];}));setUnsupported(all.filter(item=>!groupLegacyAccount(item)));setPlatforms([]);}
        }
      }catch(cause){if(!controller.signal.aborted)setError(cause);}finally{if(!controller.signal.aborted)setLoading(false);}
    })();return()=>controller.abort();
  },[canView,retry]);
  const visibleCodes=useMemo(()=>{
    const codes:PlatformCode[]=[];
    for(const account of accounts)if(platformCatalog.some(item=>item.platform_code===account.canonical_code)&&!codes.includes(account.canonical_code))codes.push(account.canonical_code);
    if(previewTab&&!codes.includes(previewTab))codes.push(previewTab);
    return codes;
  },[accounts,previewTab]);
  const activeCode=visibleCodes.includes(selected)?selected:visibleCodes[0]??selected;
  const visibleAccounts=accounts.filter(item=>item.canonical_code===activeCode);
  const available=filteredPlatforms(platformCatalog.filter(item=>!visibleCodes.includes(item.platform_code)&&(!enabled||platforms.some(platform=>platform.platform_code===item.platform_code))),search);
  const select=(code:PlatformCode)=>{setSelected(code);requestAnimationFrame(()=>tabs.current[code]?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'}));};
  function keyTab(event:KeyboardEvent<HTMLButtonElement>,index:number){if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const code=visibleCodes[nextTabIndex(event.key,index,visibleCodes.length)];select(code);tabs.current[code]?.focus();}
  function openEditor(platform:PlatformCode,account?:SocialAccount){setEditor({platform,account});setDraft(account?{suffix:accountSuffix(account.label,platform),description:account.description??'',url:account.url}:emptyDraft);setFormError('');setDirty(false);}
  function patch<K extends keyof AccountDraft>(key:K,value:AccountDraft[K]){setDraft(current=>({...current,[key]:value}));setDirty(true);setFormError('');}
  const closeEditor=()=>{if(busy)return;if(dirty)setDiscard(true);else setEditor(null);};
  async function save(event:FormEvent){event.preventDefault();if(!enabled||!editor||!canEdit)return;
    let result:ReturnType<typeof accountChanges>;
    try{result=accountChanges(editor.platform,draft,editor.account);}catch(cause){setFormError((cause as Error).message);return;}
    setBusy(true);setFormError('');
    try{
      if(editor.account)await api(`/admin/social-media/accounts/${editor.account.id}`,{method:'PATCH',body:JSON.stringify(result.body)});
      else await api('/admin/social-media/accounts',{method:'POST',body:JSON.stringify({platform_code:editor.platform,...result.body})});
      setEditor(null);setDirty(false);setRetry(value=>value+1);toast(`${result.label} berhasil ${editor.account?'diperbarui':'ditambahkan'}.`);
    }catch(cause){setFormError(errorMessage(cause));}finally{setBusy(false);}
  }
  async function remove(){if(!deleting||!enabled)return;setBusy(true);
    try{await api(`/admin/social-media/accounts/${deleting.id}`,{method:'DELETE'});setDeleting(null);setRetry(value=>value+1);toast('Akun berhasil dihapus.');}
    catch(cause){setDeleting(null);toast(errorMessage(cause),'error');}finally{setBusy(false);}
  }
  async function toggle(account:SocialAccount){if(!enabled||!canEdit||toggling!==null)return;setToggling(account.id);
    try{const saved=(await api<SocialAccount>(`/admin/social-media/accounts/${account.id}`,{method:'PATCH',body:JSON.stringify({is_active:!Boolean(account.is_active)})})).data;setAccounts(items=>items.map(item=>item.id===account.id?saved:item));}
    catch(cause){toast(errorMessage(cause),'error');}finally{setToggling(null);}
  }
  if(!canView)return <div className="cms-page"><div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin untuk melihat Manajemen Sosial Media.</div></div>;
  return <div className="cms-page cms-social-page">
    <div className="cms-page-head cms-social-head"><div><h1>Manajemen Sosial Media</h1><p>Kelola akun media sosial dan kontak yang dapat digunakan di berbagai bagian CMS.</p></div><button type="button" className="cms-button primary" onClick={()=>{setSearch('');setPicker(true);}} disabled={loading||!canEdit}><Plus size={18}/>Tambah Media Sosial</button></div>
    {error&&<div className="cms-social-alert" role="alert"><Notice error={error}/><button className="cms-button secondary" type="button" onClick={()=>setRetry(value=>value+1)}>Coba lagi</button></div>}
    {!loading&&capabilities&&!enabled&&<div className="cms-social-pending" role="status"><strong>Pratinjau sebelum migrasi</strong><span>Akun lama ditampilkan apa adanya. Penambahan, pengubahan, dan penghapusan melalui halaman ini belum tersedia.</span>{accounts[0]&&<Link to={`/admin/site/social-links/${accounts[0].id}`}>Buka editor lama</Link>}</div>}
    {loading?<Loading/>:!error&&<>
      {visibleCodes.length>0?<div className="cms-social-tabs" role="tablist" aria-label="Platform sosial media">{visibleCodes.map((code,index)=><button key={code} ref={node=>{tabs.current[code]=node;}} type="button" role="tab" id={`social-tab-${code}`} aria-selected={activeCode===code} aria-controls="social-platform-panel" tabIndex={activeCode===code?0:-1} className={activeCode===code?'active':''} onClick={()=>select(code)} onKeyDown={event=>keyTab(event,index)}><PlatformIcon code={code}/><span>{platformNames[code]}</span><small>{accounts.filter(item=>item.canonical_code===code).length}</small></button>)}</div>:<Empty>Belum ada akun sosial media. Gunakan “Tambah Media Sosial” untuk memilih platform.</Empty>}
      {visibleCodes.length>0&&<section id="social-platform-panel" role="tabpanel" aria-labelledby={`social-tab-${activeCode}`} className="cms-social-panel"><div className="cms-social-summary"><div className="cms-social-summary-icon"><PlatformIcon code={activeCode} size={30}/></div><div><h2>{platformNames[activeCode]}</h2><p>{visibleAccounts.length} dari 5 akun tersimpan{previewTab===activeCode&&!visibleAccounts.length?' · Platform ini belum memiliki akun.':''}</p></div><button type="button" className="cms-button primary" onClick={()=>openEditor(activeCode)} disabled={!canEdit||!canAddAccount(visibleAccounts.length)}><Plus size={17}/>Tambah Akun</button></div>
      {!canAddAccount(visibleAccounts.length)&&<p className="cms-social-limit" role="status">Batas maksimal lima akun untuk platform ini telah tercapai. Anda masih dapat mengubah atau menghapus akun.</p>}
      {!visibleAccounts.length?<Empty>Belum ada akun {platformNames[activeCode]}. {canEdit?'Gunakan “Tambah Akun” untuk menyiapkan akun pertama.':'Minta pengelola CMS menambahkan akun.'}</Empty>:<div className="cms-social-grid">{visibleAccounts.map(account=><article key={account.id} className="cms-social-card"><div className="cms-social-card-top"><span className="cms-social-card-icon"><PlatformIcon code={activeCode} size={24}/></span><button type="button" role="switch" aria-checked={Boolean(account.is_active)} aria-label={`${account.is_active?'Nonaktifkan':'Aktifkan'} ${account.label}`} className={`cms-social-status cms-social-status-toggle ${account.is_active?'is-active':'is-inactive'}`} disabled={!enabled||!canEdit||toggling!==null} onClick={()=>void toggle(account)}>{toggling===account.id?'Menyimpan…':account.is_active?'Aktif ●':'Nonaktif ○'}</button></div><h3>{account.label}</h3>{account.description&&<p>{account.description}</p>}<div className="cms-social-link-preview" title={account.url}><ExternalLink size={15} aria-hidden="true"/><span>{account.url}</span></div><div className="cms-social-card-actions">{safeAccountHref(account.url,activeCode)?<a className="cms-button secondary" href={safeAccountHref(account.url,activeCode)!} target="_blank" rel="noopener noreferrer" aria-label={`Cek URL ${account.label} di tab baru`}><ExternalLink size={15}/>Cek URL</a>:<span className="cms-social-url-unavailable">URL tidak aman</span>}<button type="button" className="cms-button secondary" onClick={()=>openEditor(activeCode,account)} disabled={!canEdit||toggling!==null}>Edit</button><button type="button" className="cms-button danger" onClick={()=>setDeleting(account)} disabled={!canEdit||!enabled||toggling!==null}>Hapus</button>{!enabled&&<Link to={`/admin/site/social-links/${account.id}`}>Editor lama</Link>}</div></article>)}</div>}
      </section>}
      {unsupported.length>0&&<section className="cms-social-unsupported"><h2>Akun dengan platform belum dikenali</h2><p>Platform akun berikut belum ada dalam katalog. Akun ini tidak dapat digunakan untuk membuat akun baru.</p>{unsupported.map(account=><Link key={account.id} to={`/admin/site/social-links/${account.id}`}>{account.label}</Link>)}</section>}
    </>}
    {picker&&<CmsModal title="Pilih media sosial" onClose={()=>setPicker(false)} className="cms-social-modal"><p>Pilih platform untuk menyiapkan akun. Platform yang sudah ada tampil sebagai tab.</p><label className="cms-social-search"><Search size={18}/><span className="cms-sr-only">Cari platform</span><input autoFocus value={search} onChange={event=>setSearch(event.target.value)} placeholder="Cari platform…"/></label><div className="cms-social-platform-list">{available.map(item=><button type="button" key={item.platform_code} onClick={()=>{setPreviewTab(item.platform_code);setPicker(false);select(item.platform_code);}}><item.Icon size={22} aria-hidden="true"/><span>{item.name}</span><Plus size={17} aria-hidden="true"/></button>)}{!available.length&&<p>Tidak ada platform lain yang cocok.</p>}</div></CmsModal>}
    {editor&&!discard&&<CmsModal title={editor.account?'Edit akun sosial media':'Tambah akun sosial media'} onClose={closeEditor} busy={busy} className="cms-social-modal"><form id="cms-social-account-form" onSubmit={event=>void save(event)}><div className="cms-social-selected"><PlatformIcon code={editor.platform} size={23}/><strong>{platformNames[editor.platform]}</strong><span>Platform terkunci untuk akun ini</span></div><div className="cms-field"><label>Nama akun <span className="cms-required">· Wajib</span></label><div className="cms-social-label-field"><span>{platformNames[editor.platform]} - </span><input value={draft.suffix} onChange={event=>patch('suffix',event.target.value)} maxLength={100-platformNames[editor.platform].length-3} required placeholder="Akun Utama" aria-label="Nama akun setelah nama platform"/></div><small>Nama lengkap: {platformNames[editor.platform]} - {draft.suffix.trim()||'…'}</small></div><div className="cms-field"><label htmlFor="social-description">Deskripsi Akun · Opsional</label><textarea id="social-description" value={draft.description} onChange={event=>patch('description',event.target.value)} maxLength={1000} placeholder="Contoh: Untuk pertanyaan produk dan pemesanan."/><small>{draft.description.length}/1.000 karakter</small></div><div className="cms-field"><label htmlFor="social-url">URL akun <span className="cms-required">· Wajib</span></label><input id="social-url" type="url" value={draft.url} onChange={event=>patch('url',event.target.value)} maxLength={1000} required placeholder={editor.platform==='whatsapp'?'https://wa.me/628123456789':'https://…'}/></div>{formError&&<p className="cms-social-form-error" role="alert">{formError}</p>}{!enabled&&<p className="cms-social-form-note" role="status">Fitur penyimpanan Sosial Media sedang disiapkan dan belum tersedia. Isian ini hanya untuk pratinjau.</p>}<div className="cms-actions end"><button type="button" className="cms-button secondary" onClick={closeEditor}>Batal</button><button type="submit" className="cms-button primary" disabled={!enabled||!canEdit||busy}>{busy?'Menyimpan…':'Simpan akun'}</button></div></form></CmsModal>}
    {discard&&<ConfirmDialog title="Tinggalkan perubahan?" onCancel={()=>setDiscard(false)} onConfirm={()=>{setDiscard(false);setDirty(false);setEditor(null);}} confirmLabel="Tinggalkan"><p>Perubahan yang belum disimpan akan hilang.</p></ConfirmDialog>}
    {deleting&&<ConfirmDialog title="Hapus akun sosial media?" onCancel={()=>setDeleting(null)} onConfirm={()=>void remove()} busy={busy} confirmLabel="Hapus akun"><p>Akun “{deleting.label}” akan dihapus. Akun yang masih digunakan pada produk tidak dapat dihapus.</p></ConfirmDialog>}
    {toastElement}
  </div>;
}
