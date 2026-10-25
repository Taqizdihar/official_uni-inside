import {useState} from 'react';
import {useParams} from 'react-router-dom';
import {useAuth} from '../auth/AuthProvider';
import {Loading,Notice,ConfirmDialog,useToast} from '../components/Ui';
import {CmsButtonDestinationField} from '../components/CmsButtonDestinationField';
import {MediaPicker} from '../components/MediaPicker';
import {EditorialField,EditorialPanel,EditorialSaveBar,LockedIdentity,PendingEditorial} from '../about-team/EditorControls';
import {useFixedEditor,useEditorialUnsaved} from '../about-team/useFixedEditor';
import {secondaryNames,secondarySpecs,validateSecondaryValues,type SecondaryName} from '../../../backend/src/contracts/secondaryPages';
import './about-team.css';
import '../secondary/secondary.css';
type Response={edit:Record<string,string>;version:string;enabled:boolean;pending:Record<string,string>;reason?:string;capabilities:{contentSlots:boolean;manualBanner:boolean;projects:boolean}};
export function SecondaryPageSettings(){
 const {page}=useParams();
 return secondaryNames.includes(page as SecondaryName)?<SecondaryEditor key={page} name={page as SecondaryName}/>:<div className="cms-notice cms-notice-error">Halaman tidak ditemukan.</div>;
}
export function SecondaryEditor({name}:{name:SecondaryName}){
 const {has}=useAuth(),canView=has('settings.view'),canEdit=has('settings.update'),spec=secondarySpecs[name];
 const validate=(next:Record<string,string>,old:Record<string,string>)=>validateSecondaryValues(name,next,old);
 const editor=useFixedEditor<Record<string,string>,Response>(`/admin/secondary-pages/${name}`,canView,canEdit,validate);
 const [discard,setDiscard]=useState(false),[reloadRequested,setReloadRequested]=useState(false),{toast,element}=useToast();
 useEditorialUnsaved(editor.dirty);
 const disabled=!canEdit||editor.busy||!editor.saved?.enabled;
 if(!canView)return <div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin melihat pengaturan halaman.</div>;
 return <div className="cms-page cms-editorial-page cms-secondary-page"><div className="cms-page-head"><div><h1>{spec.label}</h1><p>Pengaturan halaman lanjutan {spec.label}. Konten Postingan dikelola melalui menu terpisah.</p></div></div>
  {editor.error&&<><Notice error={editor.error}/><button className="cms-button secondary" type="button" onClick={editor.reload}>Coba lagi</button></>}
  {editor.loading?<Loading/>:editor.draft&&editor.saved&&!editor.error&&<>
   {!editor.saved.enabled&&<div className="cms-secondary-disabled" role="status"><strong>Belum diaktifkan</strong><p>{editor.saved.reason} Formulir berikut disiapkan untuk peninjauan dan belum dapat disimpan.</p></div>}
   {!canEdit&&<p className="cms-editorial-readonly">Mode baca. Pengaturan tidak dapat diubah oleh akun ini.</p>}
   <form id="secondary-form" noValidate onSubmit={async event=>{event.preventDefault();if(editor.saved?.enabled&&await editor.save())toast('Pengaturan halaman berhasil disimpan.');}}>
    <div className="cms-editorial-sections">{spec.panels.map((panel,index)=><EditorialPanel key={panel.title} number={String(index+1).padStart(2,'0')} title={panel.title} description={panel.description}>
     {panel.locked&&<LockedIdentity>{panel.locked}</LockedIdentity>}
     <div className="cms-secondary-fields">{panel.fields.map(field=><div className={field.key==='cta_heading'||field.multiline&&!['studio_description','craft_description'].includes(field.key)?'cms-secondary-wide':''} key={field.key}>
      {field.kind==='destination'?<CmsButtonDestinationField id={`secondary-${field.key}`} value={editor.draft![field.key]??field.fallback} disabled={disabled} onChange={value=>editor.change(old=>({...old,[field.key]:value}))} error={editor.issues[field.key]}/>:<EditorialField id={`secondary-${field.key}`} label={field.label} value={field.column?editor.draft![field.key]??'':editor.saved!.pending[field.key]??field.fallback} oldValue={field.column?editor.saved!.edit[field.key]:field.fallback} limit={field.limit} required={!field.optional} multiline={field.multiline} rows={field.limit>=250?5:3} pending={!field.column} pendingHint={false} disabled={disabled} error={editor.issues[field.key]} onChange={value=>editor.change(old=>({...old,[field.key]:value}))}/>}
      {field.fixedTarget&&<small className="cms-secondary-fixed">Tujuan tetap: {field.fixedTarget}</small>}
     </div>)}</div>
     {name==='products'&&index===0&&<div className="cms-secondary-banner"><h3>Gambar banner</h3><div className="cms-secondary-banner-modes"><label><input type="radio" name="banner-mode" checked readOnly/>Otomatis</label><label><input type="radio" name="banner-mode" disabled/>Pilih Gambar</label></div><p>Gambar mengikuti produk terbit. Pilihan manual menunggu penyimpanan referensi gambar.</p><MediaPicker scope="projects" value={null} onChange={()=>{}} allowUpload={false} disabled formats={['jpg','jpeg','png','webp','avif']}/><small>Referensi manual akan memakai aset Halaman Lanjutan dan mempertahankan rasio gambar.</small></div>}
     {panel.fields.some(field=>!field.column)&&<PendingEditorial>Isian abu-abu menunggu aktivasi penyimpanan. Isian aktif dapat disimpan melalui tombol di bawah.</PendingEditorial>}
     {name==='media-kit'&&index===0&&<p className="cms-secondary-fixed">Alamat email mengikuti pengaturan Footer; tidak diisi ulang di sini.</p>}
    </EditorialPanel>)}</div>
    <Notice error={editor.saveError}/>{editor.saveError&&<button type="button" className="cms-button secondary" onClick={()=>{if(editor.dirty){setReloadRequested(true);setDiscard(true);}else editor.reload();}}>Muat ulang konten</button>}
    {editor.saved.enabled?<EditorialSaveBar form="secondary-form" dirty={editor.dirty} busy={editor.busy} canEdit={!disabled} onDiscard={()=>setDiscard(true)}/>:<div className="cms-editorial-savebar"><span>Pengaturan disiapkan; belum tersimpan atau diaktifkan.</span><button type="button" className="cms-button primary" disabled>Simpan Perubahan</button></div>}
   </form>
  </>}
  {discard&&<ConfirmDialog title="Buang perubahan?" confirmLabel="Buang perubahan" onCancel={()=>{setDiscard(false);setReloadRequested(false);}} onConfirm={()=>{editor.reset();setDiscard(false);if(reloadRequested)editor.reload();setReloadRequested(false);}}><p>Formulir akan kembali ke nilai yang tersimpan.</p></ConfirmDialog>}{element}
 </div>;
}
