import {useEffect,useState} from 'react';
import {ExternalLink,Palette} from 'lucide-react';
import {useAuth} from '../auth/AuthProvider';
import {ConfirmDialog,Loading,Notice,useToast} from '../components/Ui';
import {CollectionManager} from '../about-team/CollectionManager';
import {EditorialField,EditorialPanel,EditorialSaveBar} from '../about-team/EditorControls';
import {useEditorialUnsaved,useFixedEditor} from '../about-team/useFixedEditor';
import {api} from '../api/client';
import {textIssues} from '../../../backend/src/contracts/aboutTeam';
import './about-team.css';

type TeamEdit={heading:string};
type TeamResponse={edit:TeamEdit;version:string;template:{url:string;enabled:boolean;roleMayEdit:boolean};managedTeam:boolean};
const validate=(next:TeamEdit,old:TeamEdit)=>textIssues('heading',next.heading,15,old.heading);
const formId='cms-team-fixed-form';
export function TeamSettingsPage(){
  const {has}=useAuth(),canView=has('homepage.view'),canEdit=has('homepage.update');
  const editor=useFixedEditor<TeamEdit,TeamResponse>('/admin/homepage/team',canView,canEdit,validate);
  const [discard,setDiscard]=useState(false),[recordDirty,setRecordDirty]=useState(false),[templateDraft,setTemplateDraft]=useState(''),[templateBusy,setTemplateBusy]=useState(false),[templateError,setTemplateError]=useState(''),{toast,element}=useToast();
  useEffect(()=>{if(editor.saved)setTemplateDraft(editor.saved.template.url);},[editor.saved]);
  const templateDirty=Boolean(editor.saved&&templateDraft!==editor.saved.template.url);
  useEditorialUnsaved(editor.dirty||recordDirty||templateDirty);
  async function saveTemplate(){if(!editor.saved?.template.enabled||!editor.saved.template.roleMayEdit||!templateDirty||templateBusy)return;setTemplateBusy(true);setTemplateError('');try{await api('/admin/homepage/team/template',{method:'PATCH',body:JSON.stringify({url:templateDraft})});toast('URL template kartu berhasil disimpan.');editor.reload();}catch(cause){setTemplateError((cause as Error).message||'URL template belum tersimpan.');}finally{setTemplateBusy(false);}}
  if(!canView)return <div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin melihat Our Team.</div>;
  return <div className="cms-page cms-editorial-page"><div className="cms-page-head"><div><h1>Our Team</h1><p>Kelola judul bagian dan kartu anggota yang memperkenalkan tim Uni-Inside.</p></div></div>
    {editor.error&&<><Notice error={editor.error}/><button type="button" className="cms-button secondary" onClick={editor.reload}>Coba lagi</button></>}
    {editor.loading?<Loading/>:editor.saved&&editor.draft&&!editor.error&&<div className="cms-editorial-sections">
      <EditorialPanel number="01" title="Konten Utama" description="Judul yang tampil di atas kartu anggota. Mode fan dan ring tetap mengikuti desain website."><form id={formId} noValidate onSubmit={async event=>{event.preventDefault();if(await editor.save())toast('Heading Our Team berhasil disimpan.');}}><div className="cms-editorial-narrow"><EditorialField id="team-heading" label="Heading" value={editor.draft.heading} oldValue={editor.saved.edit.heading} limit={15} disabled={!canEdit||editor.busy} error={editor.issues.heading} onChange={value=>editor.change(previous=>({...previous,heading:value}))}/></div></form><Notice error={editor.saveError}/><EditorialSaveBar form={formId} dirty={editor.dirty} busy={editor.busy} canEdit={canEdit} onDiscard={()=>setDiscard(true)}/></EditorialPanel>
      <EditorialPanel number="02" title="Manajemen Kartu Anggota" description="Siapkan desain sisi depan dan detail pribadi pada sisi belakang kartu.">
        <div className="cms-editorial-template"><span className="cms-editorial-template-icon"><Palette size={25}/></span><div><h3>Template Desain Kartu Anggota</h3><p>Gunakan template Canva untuk membuat desain kartu anggota sebelum mengunggah hasilnya melalui Manajemen Aset.</p><strong>Ukuran wajib: 1080 × 1350 px (rasio 4:5).</strong><small>{editor.saved.template.enabled?editor.saved.template.roleMayEdit?'Administrator dapat mengubah URL template resmi.':'Hanya Super Administrator dan Administrator dapat mengubah URL.':editor.saved.template.roleMayEdit?'Perubahan URL template menunggu aktivasi penyimpanan.':'URL template hanya dapat diubah oleh Super Administrator dan Administrator setelah penyimpanan diaktifkan.'}</small></div><a href={editor.saved.template.url} target="_blank" rel="noopener noreferrer" className="cms-button secondary"><ExternalLink size={16}/>Buka Canva</a></div>
        {editor.saved.template.enabled&&editor.saved.template.roleMayEdit&&<div className="cms-editorial-template-form"><label htmlFor="team-card-template-url">URL template Canva</label><input id="team-card-template-url" type="url" value={templateDraft} maxLength={1000} disabled={templateBusy} onChange={event=>{setTemplateDraft(event.target.value);setTemplateError('');}}/><button type="button" className="cms-button primary" disabled={!templateDirty||templateBusy} onClick={()=>void saveTemplate()}>{templateBusy?'Menyimpan…':'Simpan URL Template'}</button>{templateError&&<small role="alert" className="cms-field-error">{templateError}</small>}</div>}
        {!editor.saved.managedTeam&&<p className="cms-editorial-rollout">Kartu anggota dapat disiapkan dan disimpan. Website tetap menampilkan sembilan kartu saat ini sampai koleksi yang dikelola diaktifkan.</p>}
        <CollectionManager kind="team-members" onDirtyChange={setRecordDirty}/>
      </EditorialPanel>
    </div>}
    {discard&&<ConfirmDialog title="Batalkan perubahan Heading?" confirmLabel="Buang perubahan" onCancel={()=>setDiscard(false)} onConfirm={()=>{editor.reset();setDiscard(false);}}><p>Heading akan kembali ke nilai tersimpan.</p></ConfirmDialog>}{element}
  </div>;
}
