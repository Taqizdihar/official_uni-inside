import {useEffect,useState,type FormEvent} from 'react';
import {useBeforeUnload} from 'react-router-dom';
import {LockKeyhole} from 'lucide-react';
import {api,ApiError} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {CmsButtonDestinationField} from '../components/CmsButtonDestinationField';
import {Loading,Notice,useToast} from '../components/Ui';
import {setEditorDirty} from '../dirty';
import {fields,length,validateSection,type SectionEdit,type SectionKind} from '../homepage/model';
import {AchievementsManagement} from './AchievementsManagement';
import {ContactPlacementPreview,NewsSelectionPreview} from './HomepagePlacementPreviews';
import './hero-settings.css';
import './homepage-sections.css';

type Response={edit:SectionEdit;capabilities:{contactSocialPlacements:boolean;contactCraftUrl:boolean;homepageNewsSelection:boolean;homepageNewsPopularity:boolean}};
const titles:Record<SectionKind,string>={contact:'Contact Us',achievements:'Achievements',news:'News',services:'Services',products:'Products'};
export function HomepageSectionPage({kind}:{kind:SectionKind}){
  const {has}=useAuth(),canView=has('homepage.view'),canEdit=has('homepage.update');
  const [saved,setSaved]=useState<Response|null>(null),[draft,setDraft]=useState<SectionEdit|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null),[saveError,setSaveError]=useState<unknown>(null),[fieldErrors,setFieldErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0),[orderDirty,setOrderDirty]=useState(false);
  const {toast,element}=useToast(),fixedDirty=Boolean(saved&&draft&&JSON.stringify(saved.edit)!==JSON.stringify(draft)),dirty=fixedDirty||orderDirty;
  useBeforeUnload(event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  useEffect(()=>{setEditorDirty(dirty);return()=>setEditorDirty(false);},[dirty]);
  useEffect(()=>{if(!canView){setLoading(false);return;}const controller=new AbortController();setLoading(true);setError(null);api<Response>(`/admin/homepage/${kind}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setSaved(result.data);setDraft(result.data.edit);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[canView,kind,retry]);
  function change(key:string,value:string){setDraft(previous=>previous?{...previous,[key]:value}:previous);setFieldErrors({});setSaveError(null);}
  async function save(event:FormEvent){event.preventDefault();if(!saved||!draft||!fixedDirty||!canEdit||busy)return;const errors=validateSection(kind,draft,saved.edit);if(Object.keys(errors).length){setFieldErrors(errors);return;}setBusy(true);setSaveError(null);try{const result=(await api<Response>(`/admin/homepage/${kind}`,{method:'PATCH',body:JSON.stringify(draft)})).data;setSaved(result);setDraft(result.edit);toast('Perubahan berhasil disimpan.');}catch(cause){setSaveError(cause);setFieldErrors(Object.fromEntries(((cause as ApiError).details??[]).filter(item=>item.path).map(item=>[item.path!,item.message??'Periksa isian.'])));}finally{setBusy(false);}}
  if(!canView)return <div className="cms-page"><div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin melihat bagian Homepage ini.</div></div>;
  return <div className="cms-page cms-hero-page cms-homepage-page"><div className="cms-page-head"><div><h1>{titles[kind]}</h1><p>Kelola konten bagian {titles[kind]} pada halaman utama.</p></div></div>
    {error&&<div><Notice error={error}/><button type="button" className="cms-button secondary" onClick={()=>setRetry(value=>value+1)}>Coba lagi</button></div>}
    {loading?<Loading/>:saved&&draft&&!error&&<><form className="cms-hero-form" noValidate onSubmit={event=>void save(event)}><section className="cms-card cms-hero-section"><div className="cms-section-heading"><h2>Konten Utama</h2><p>Perubahan teks tersimpan tanpa mengubah elemen animasi dan identitas bagian.</p></div>
      {kind==='products'&&<div className="cms-homepage-locked"><LockKeyhole size={19} aria-hidden="true"/><span>OUR PRODUCTS</span><small>Judul dan logo Uni-Inside Crafts terkunci.</small></div>}
      <div className="cms-hero-grid two">{fields[kind].map(field=>field.url?<CmsButtonDestinationField key={field.key} id={`${kind}-${field.key}`} value={draft[field.key]??''} onChange={value=>change(field.key,value)} disabled={!canEdit||busy} error={fieldErrors[field.key]}/>:<div className="cms-hero-field" key={field.key}><label htmlFor={`${kind}-${field.key}`}>{field.label} <span className="cms-homepage-limit">(maks. {field.limit} karakter)</span></label><input id={`${kind}-${field.key}`} value={draft[field.key]??''} onChange={event=>change(field.key,event.target.value)} disabled={!canEdit||busy} aria-invalid={Boolean(fieldErrors[field.key]||length(draft[field.key]??'')>field.limit)} aria-describedby={`${kind}-${field.key}-count`}/><div className="cms-hero-help" id={`${kind}-${field.key}-count`}>{length(saved.edit[field.key]??'')>field.limit&&draft[field.key]===saved.edit[field.key]&&<small>Nilai lama melebihi batas; ubah bila ingin memperbaruinya.</small>}<small>{length(draft[field.key]??'')}/{field.limit} karakter</small></div>{fieldErrors[field.key]&&<small className="cms-field-error" role="alert">{fieldErrors[field.key]}</small>}</div>)}</div>
      {kind==='news'&&<p className="cms-homepage-copy-note">Subtitle lama yang melebihi 50 karakter tetap tampil sampai Anda mengubahnya.</p>}
      </section><div className="cms-hero-actions"><button className="cms-button secondary" type="button" disabled={!fixedDirty||busy} onClick={()=>{setDraft(saved.edit);setFieldErrors({});}}>Batal</button><button className="cms-button primary" type="submit" disabled={!fixedDirty||!canEdit||busy}>{busy?'Menyimpan…':'Simpan Perubahan'}</button></div>{saveError&&<Notice error={saveError}/>}</form>
      {kind==='achievements'&&<AchievementsManagement onOrderDirtyChange={setOrderDirty}/>}
      {kind==='contact'&&<ContactPlacementPreview/>}
      {kind==='news'&&<NewsSelectionPreview/>}
    </>}{element}
  </div>;
}
