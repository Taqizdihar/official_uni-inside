import {useState} from 'react';
import {useAuth} from '../auth/AuthProvider';
import {ConfirmDialog,Loading,Notice,useToast} from '../components/Ui';
import {CollectionManager} from '../about-team/CollectionManager';
import {EditorialField,EditorialPanel,EditorialSaveBar,LockedIdentity,PendingEditorial,TextListEditor} from '../about-team/EditorControls';
import {useEditorialUnsaved,useFixedEditor} from '../about-team/useFixedEditor';
import {validateAboutEdit,type AboutEdit,type AboutPreview} from '../../../backend/src/contracts/aboutTeam';
import './about-team.css';

type AboutResponse={edit:AboutEdit;version:string;pending:AboutPreview;capabilities:{aboutEditorial:boolean;workspaceTags:boolean;collaboratorTypes:boolean};managedPartners:boolean};
const formId='cms-about-fixed-form';
export function AboutSettingsPage(){
  const {has}=useAuth(),canView=has('homepage.view'),canEdit=has('homepage.update');
  const editor=useFixedEditor<AboutEdit,AboutResponse>('/admin/homepage/about',canView,canEdit,validateAboutEdit);
  const [discard,setDiscard]=useState(false),[recordDirty,setRecordDirty]=useState(false),{toast,element}=useToast();
  useEditorialUnsaved(editor.dirty||recordDirty);
  if(!canView)return <div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin melihat About Us.</div>;
  const saved=editor.saved,draft=editor.draft,pending=saved?.pending,disabled=!canEdit||editor.busy;
  const field=(id:string,label:string,value:string,oldValue:string,limit:number,onChange:(value:string)=>void,multiline=false)=><EditorialField id={`about-${id.replace(/\./g,'-')}`} label={label} value={value} oldValue={oldValue} limit={limit} multiline={multiline} onChange={onChange} disabled={disabled} error={editor.issues[id]} form={formId}/>;
  return <div className="cms-page cms-editorial-page"><div className="cms-page-head"><div><h1>About Us</h1><p>Lima bagian cerita Uni-Inside, dalam satu editor yang terstruktur.</p></div></div>
    {editor.error&&<><Notice error={editor.error}/><button type="button" className="cms-button secondary" onClick={editor.reload}>Coba lagi</button></>}
    {editor.loading?<Loading/>:saved&&draft&&pending&&!editor.error&&<>
      <form id={formId} noValidate onSubmit={async event=>{event.preventDefault();if(await editor.save())toast('Konten About Us yang tersedia berhasil disimpan. Isian yang menunggu aktivasi tidak diubah.');}}/>
      {!canEdit&&<div className="cms-editorial-readonly">Mode baca. Anda dapat melihat konten, tetapi tidak mengubah pengaturan bagian ini.</div>}
      <div className="cms-editorial-sections">
        <EditorialPanel number="01" title="ABOUT US" description="Subtitle, deskripsi, dan highlight pada pembuka About Us.">
          <LockedIdentity>ABOUT US</LockedIdentity><div className="cms-editorial-fields">
            {field('intro.subtitle','Subtitle',draft.intro.subtitle,saved.edit.intro.subtitle,50,value=>editor.change(previous=>({...previous,intro:{...previous.intro,subtitle:value}})))}
            {field('intro.description','Deskripsi',draft.intro.description,saved.edit.intro.description,170,value=>editor.change(previous=>({...previous,intro:{...previous.intro,description:value}})),true)}
            <EditorialField id="about-highlight" label="Highlight" value={pending.highlight} limit={50} pending/>
          </div><PendingEditorial>Highlight menunggu penyimpanan tambahan. Logo kompleks, tiga ikon, dan animasi tetap mengikuti desain website.</PendingEditorial>
        </EditorialPanel>
        <EditorialPanel number="02" title="OUR ECOSYSTEM" description="Dua workspace tetap: Uni-Inside Studio dan Uni-Inside Craft.">
          <div className="cms-editorial-grid two"><EditorialField id="ecosystem-eyebrow" label="Eyebrow" value={pending.ecosystemEyebrow} limit={30} pending/>{field('ecosystem.heading','Heading',draft.ecosystem.heading,saved.edit.ecosystem.heading,40,value=>editor.change(previous=>({...previous,ecosystem:{...previous.ecosystem,heading:value}})))}</div>
          <EditorialField id="ecosystem-description" label="Deskripsi pengantar" value={pending.ecosystemDescription} limit={100} multiline pending/>
          <div className="cms-editorial-grid two cms-editorial-workspaces">{draft.ecosystem.workspaces.map((workspace,index)=><div className="cms-editorial-subpanel" key={workspace.key}><LockedIdentity>{workspace.key==='studio'?'Uni-Inside Studio':'Uni-Inside Craft'}</LockedIdentity>
            {field(`ecosystem.workspaces.${index}.subtitle`,'Subtitle',workspace.subtitle,saved.edit.ecosystem.workspaces[index].subtitle,30,value=>editor.change(previous=>({...previous,ecosystem:{...previous.ecosystem,workspaces:previous.ecosystem.workspaces.map((item,i)=>i===index?{...item,subtitle:value}:item)}})))}
            {field(`ecosystem.workspaces.${index}.description`,'Deskripsi',workspace.description,saved.edit.ecosystem.workspaces[index].description,180,value=>editor.change(previous=>({...previous,ecosystem:{...previous.ecosystem,workspaces:previous.ecosystem.workspaces.map((item,i)=>i===index?{...item,description:value}:item)}})),true)}
            <TextListEditor id={`tags-${workspace.key}`} label="Tag" items={pending.workspaceTags[workspace.key]} disabled max={5} limit={10}/>
          </div>)}</div><PendingEditorial>Eyebrow, deskripsi pengantar, dan tag menunggu aktivasi penyimpanan. Subtitle dan deskripsi kedua workspace dapat disimpan sekarang.</PendingEditorial>
        </EditorialPanel>
        <EditorialPanel number="03" title="VISION & MISSION" description="Dua kartu tetap dengan tiga poin misi yang berurutan.">
          <EditorialField id="vision-mission-eyebrow" label="Eyebrow" value={pending.visionMission.eyebrow} limit={30} pending/>
          <div className="cms-editorial-grid two"><div className="cms-editorial-subpanel"><LockedIdentity>01 / Vision</LockedIdentity><EditorialField id="vision-heading" label="Heading" value={pending.visionMission.visionHeading} limit={60} multiline pending/><EditorialField id="vision-description" label="Deskripsi" value={pending.visionMission.visionDescription} limit={130} multiline pending/></div><div className="cms-editorial-subpanel"><LockedIdentity>02 / Mission</LockedIdentity><EditorialField id="mission-heading" label="Heading" value={pending.visionMission.missionHeading} limit={60} multiline pending/>{pending.visionMission.missionPoints.map((point,index)=><EditorialField key={index} id={`mission-point-${index}`} label={`Poin Misi ${index+1}`} value={point} limit={70} pending/>)}</div></div>
          <PendingEditorial>Konten Vision & Mission belum memiliki penyimpanan khusus. Teks publik saat ini tetap digunakan.</PendingEditorial>
        </EditorialPanel>
        <EditorialPanel number="04" title="WHAT GUIDES US" description="Tiga prinsip tetap yang menjelaskan cara Uni-Inside bekerja.">
          <div className="cms-editorial-grid two"><EditorialField id="guides-eyebrow" label="Eyebrow" value={pending.guidesEyebrow} limit={30} pending/>{field('guides.heading','Heading',draft.guides.heading,saved.edit.guides.heading,20,value=>editor.change(previous=>({...previous,guides:{...previous.guides,heading:value}})))}</div>
          <div className="cms-editorial-grid three">{draft.guides.principles.map((principle,index)=><div className="cms-editorial-subpanel" key={principle.slot}><LockedIdentity>Prinsip 0{principle.slot}</LockedIdentity>
            {field(`guides.principles.${index}.heading`,'Heading',principle.heading,saved.edit.guides.principles[index].heading,30,value=>editor.change(previous=>({...previous,guides:{...previous.guides,principles:previous.guides.principles.map((item,i)=>i===index?{...item,heading:value}:item)}})))}
            {field(`guides.principles.${index}.description`,'Deskripsi singkat',principle.description,saved.edit.guides.principles[index].description,110,value=>editor.change(previous=>({...previous,guides:{...previous.guides,principles:previous.guides.principles.map((item,i)=>i===index?{...item,description:value}:item)}})),true)}
          </div>)}</div><PendingEditorial>Eyebrow menunggu aktivasi. Heading bagian dan ketiga prinsip dapat disimpan sekarang.</PendingEditorial>
        </EditorialPanel>
        <EditorialPanel number="05" title="CLIENTS & COLLABORATORS" description="Konteks kolaborasi dan pengelolaan Partner dalam satu bagian.">
          <div className="cms-editorial-grid two"><EditorialField id="clients-eyebrow" label="Eyebrow" value={pending.clients.eyebrow} limit={30} pending/><EditorialField id="clients-heading" label="Heading" value={pending.clients.heading} limit={60} multiline pending/></div><EditorialField id="clients-description" label="Deskripsi" value={pending.clients.description} limit={380} multiline rows={6} pending/><TextListEditor id="collaborator-types" label="Jenis kolaborator" items={pending.clients.types} disabled max={5} limit={25}/>
          <PendingEditorial>Teks Clients & Collaborators dan jenis kolaborator menunggu penyimpanan tambahan. Paragraf dan tampilan publik saat ini tetap digunakan.</PendingEditorial>
          <div className="cms-editorial-partners"><h3>Our Partners</h3>{field('partnersHeading','Heading Partner',draft.partnersHeading,saved.edit.partnersHeading,30,value=>editor.change(previous=>({...previous,partnersHeading:value})))}{!saved.managedPartners&&<p className="cms-editorial-rollout">Partner dapat disiapkan di bawah. Film roll publik tetap menggunakan logo saat ini sampai koleksi yang dikelola diaktifkan.</p>}<CollectionManager kind="partners" onDirtyChange={setRecordDirty}/></div>
        </EditorialPanel>
      </div><Notice error={editor.saveError}/>{editor.saveError instanceof Error&&<button className="cms-button secondary" type="button" onClick={editor.reload}>Muat ulang konten tersimpan</button>}<EditorialSaveBar form={formId} dirty={editor.dirty} busy={editor.busy} canEdit={canEdit} onDiscard={()=>setDiscard(true)}/>
    </>}
    {discard&&<ConfirmDialog title="Batalkan perubahan About Us?" confirmLabel="Buang perubahan" onCancel={()=>setDiscard(false)} onConfirm={()=>{editor.reset();setDiscard(false);}}><p>Konten formulir akan kembali ke nilai tersimpan.</p></ConfirmDialog>}{element}
  </div>;
}
