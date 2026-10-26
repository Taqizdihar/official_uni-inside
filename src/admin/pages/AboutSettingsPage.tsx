import {useState} from 'react';
import {useAuth} from '../auth/AuthProvider';
import {ConfirmDialog,Loading,Notice,useToast} from '../components/Ui';
import {CollectionManager} from '../about-team/CollectionManager';
import {EditorialField,EditorialPanel,EditorialSaveBar,LockedIdentity,PendingEditorial,TextListEditor} from '../about-team/EditorControls';
import {useEditorialUnsaved,useFixedEditor} from '../about-team/useFixedEditor';
import {validateAboutEdit,validateAboutPreview,type AboutEdit,type AboutPreview} from '../../../backend/src/contracts/aboutTeam';
import './about-team.css';

type AboutResponse={edit:AboutEdit;version:string;pending:AboutPreview;capabilities:{aboutEditorial:boolean;workspaceTags:boolean;collaboratorTypes:boolean};managedPartners:boolean};
const formId='cms-about-fixed-form';
export function AboutSettingsPage(){
  const {has}=useAuth(),canView=has('homepage.view'),canEdit=has('homepage.update');
  const editor=useFixedEditor<AboutEdit,AboutResponse>('/admin/homepage/about',canView,canEdit,validateAboutEdit);
  const editorial=useFixedEditor<AboutPreview,{edit:AboutPreview;version:string;enabled:boolean}>('/admin/homepage/about/editorial',canView,canEdit,validateAboutPreview);
  const [discard,setDiscard]=useState(false),[recordDirty,setRecordDirty]=useState(false),{toast,element}=useToast();
  useEditorialUnsaved(editor.dirty||editorial.dirty||recordDirty);
  if(!canView)return <div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki izin melihat About Us.</div>;
  const saved=editor.saved,draft=editor.draft,pending=editorial.saved?.enabled?editorial.draft:saved?.pending,editorialReady=Boolean(editorial.saved?.enabled&&editorial.draft),disabled=!canEdit||editor.busy||editorial.busy;
  const field=(id:string,label:string,value:string,oldValue:string,limit:number,onChange:(value:string)=>void,multiline=false)=><EditorialField id={`about-${id.replace(/\./g,'-')}`} label={label} value={value} oldValue={oldValue} limit={limit} multiline={multiline} onChange={onChange} disabled={disabled} error={editor.issues[id]} form={formId}/>;
  const extra=(id:string,label:string,value:string,limit:number,onChange:(value:string)=>void,multiline=false,rows=3)=><EditorialField id={`about-${id}`} label={label} value={value} limit={limit} multiline={multiline} rows={rows} onChange={onChange} disabled={disabled} pending={!editorialReady} error={editorial.issues[id]} form={formId}/>;
  return <div className="cms-page cms-editorial-page"><div className="cms-page-head"><div><h1>About Us</h1><p>Lima bagian cerita Uni-Inside, dalam satu editor yang terstruktur.</p></div></div>
    {editor.error&&<><Notice error={editor.error}/><button type="button" className="cms-button secondary" onClick={editor.reload}>Coba lagi</button></>}
    {editor.loading?<Loading/>:saved&&draft&&pending&&!editor.error&&<>
      <form id={formId} noValidate onSubmit={async event=>{event.preventDefault();const base=editor.dirty?await editor.save():true;const more=editorialReady&&editorial.dirty?await editorial.save():true;if(base&&more)toast('Konten About Us berhasil disimpan.');}}/>
      {!canEdit&&<div className="cms-editorial-readonly">Mode baca. Anda dapat melihat konten, tetapi tidak mengubah pengaturan bagian ini.</div>}
      <div className="cms-editorial-sections">
        <EditorialPanel number="01" title="ABOUT US" description="Subtitle, deskripsi, dan highlight pada pembuka About Us.">
          <LockedIdentity>ABOUT US</LockedIdentity><div className="cms-editorial-fields">
            {field('intro.subtitle','Subtitle',draft.intro.subtitle,saved.edit.intro.subtitle,50,value=>editor.change(previous=>({...previous,intro:{...previous.intro,subtitle:value}})))}
            {field('intro.description','Deskripsi',draft.intro.description,saved.edit.intro.description,170,value=>editor.change(previous=>({...previous,intro:{...previous.intro,description:value}})),true)}
            {extra('highlight','Highlight',pending.highlight,50,value=>editorial.change(previous=>({...previous,highlight:value})))}
          </div>{!editorialReady&&<PendingEditorial>Highlight menunggu aktivasi penyimpanan. Logo kompleks, tiga ikon, dan animasi tetap mengikuti desain website.</PendingEditorial>}
        </EditorialPanel>
        <EditorialPanel number="02" title="OUR ECOSYSTEM" description="Dua workspace tetap: Uni-Inside Studio dan Uni-Inside Craft.">
          <div className="cms-editorial-grid two">{extra('ecosystemEyebrow','Eyebrow',pending.ecosystemEyebrow,30,value=>editorial.change(previous=>({...previous,ecosystemEyebrow:value})))}{field('ecosystem.heading','Heading',draft.ecosystem.heading,saved.edit.ecosystem.heading,40,value=>editor.change(previous=>({...previous,ecosystem:{...previous.ecosystem,heading:value}})))}</div>
          {extra('ecosystemDescription','Deskripsi pengantar',pending.ecosystemDescription,100,value=>editorial.change(previous=>({...previous,ecosystemDescription:value})),true)}
          <div className="cms-editorial-grid two cms-editorial-workspaces">{draft.ecosystem.workspaces.map((workspace,index)=><div className="cms-editorial-subpanel" key={workspace.key}><LockedIdentity>{workspace.key==='studio'?'Uni-Inside Studio':'Uni-Inside Craft'}</LockedIdentity>
            {field(`ecosystem.workspaces.${index}.subtitle`,'Subtitle',workspace.subtitle,saved.edit.ecosystem.workspaces[index].subtitle,30,value=>editor.change(previous=>({...previous,ecosystem:{...previous.ecosystem,workspaces:previous.ecosystem.workspaces.map((item,i)=>i===index?{...item,subtitle:value}:item)}})))}
            {field(`ecosystem.workspaces.${index}.description`,'Deskripsi',workspace.description,saved.edit.ecosystem.workspaces[index].description,180,value=>editor.change(previous=>({...previous,ecosystem:{...previous.ecosystem,workspaces:previous.ecosystem.workspaces.map((item,i)=>i===index?{...item,description:value}:item)}})),true)}
            <TextListEditor id={`tags-${workspace.key}`} label="Tag" items={pending.workspaceTags[workspace.key]} onChange={items=>editorial.change(previous=>({...previous,workspaceTags:{...previous.workspaceTags,[workspace.key]:items}}))} disabled={disabled||!editorialReady} max={5} limit={10}/>
          </div>)}</div>{!editorialReady&&<PendingEditorial>Eyebrow, deskripsi pengantar, dan tag menunggu aktivasi penyimpanan.</PendingEditorial>}
        </EditorialPanel>
        <EditorialPanel number="03" title="VISION & MISSION" description="Dua kartu tetap dengan tiga poin misi yang berurutan.">
          {extra('visionMission.eyebrow','Eyebrow',pending.visionMission.eyebrow,30,value=>editorial.change(previous=>({...previous,visionMission:{...previous.visionMission,eyebrow:value}})))}
          <div className="cms-editorial-grid two"><div className="cms-editorial-subpanel"><LockedIdentity>01 / Vision</LockedIdentity>{extra('visionMission.visionHeading','Heading',pending.visionMission.visionHeading,60,value=>editorial.change(previous=>({...previous,visionMission:{...previous.visionMission,visionHeading:value}})),true)}{extra('visionMission.visionDescription','Deskripsi',pending.visionMission.visionDescription,130,value=>editorial.change(previous=>({...previous,visionMission:{...previous.visionMission,visionDescription:value}})),true)}</div><div className="cms-editorial-subpanel"><LockedIdentity>02 / Mission</LockedIdentity>{extra('visionMission.missionHeading','Heading',pending.visionMission.missionHeading,60,value=>editorial.change(previous=>({...previous,visionMission:{...previous.visionMission,missionHeading:value}})),true)}{pending.visionMission.missionPoints.map((point,index)=><div key={index}>{extra(`visionMission.missionPoints.${index}`,`Poin Misi ${index+1}`,point,70,value=>editorial.change(previous=>({...previous,visionMission:{...previous.visionMission,missionPoints:previous.visionMission.missionPoints.map((item,i)=>i===index?value:item)}})))}</div>)}</div></div>
          {!editorialReady&&<PendingEditorial>Konten Vision & Mission menunggu aktivasi penyimpanan.</PendingEditorial>}
        </EditorialPanel>
        <EditorialPanel number="04" title="WHAT GUIDES US" description="Tiga prinsip tetap yang menjelaskan cara Uni-Inside bekerja.">
          <div className="cms-editorial-grid two">{extra('guidesEyebrow','Eyebrow',pending.guidesEyebrow,30,value=>editorial.change(previous=>({...previous,guidesEyebrow:value})))}{field('guides.heading','Heading',draft.guides.heading,saved.edit.guides.heading,20,value=>editor.change(previous=>({...previous,guides:{...previous.guides,heading:value}})))}</div>
          <div className="cms-editorial-grid three">{draft.guides.principles.map((principle,index)=><div className="cms-editorial-subpanel" key={principle.slot}><LockedIdentity>Prinsip 0{principle.slot}</LockedIdentity>
            {field(`guides.principles.${index}.heading`,'Heading',principle.heading,saved.edit.guides.principles[index].heading,30,value=>editor.change(previous=>({...previous,guides:{...previous.guides,principles:previous.guides.principles.map((item,i)=>i===index?{...item,heading:value}:item)}})))}
            {field(`guides.principles.${index}.description`,'Deskripsi singkat',principle.description,saved.edit.guides.principles[index].description,110,value=>editor.change(previous=>({...previous,guides:{...previous.guides,principles:previous.guides.principles.map((item,i)=>i===index?{...item,description:value}:item)}})),true)}
          </div>)}</div>{!editorialReady&&<PendingEditorial>Eyebrow menunggu aktivasi. Heading bagian dan ketiga prinsip dapat disimpan sekarang.</PendingEditorial>}
        </EditorialPanel>
        <EditorialPanel number="05" title="CLIENTS & COLLABORATORS" description="Konteks kolaborasi dan pengelolaan Partner dalam satu bagian.">
          <div className="cms-editorial-grid two">{extra('clients.eyebrow','Eyebrow',pending.clients.eyebrow,30,value=>editorial.change(previous=>({...previous,clients:{...previous.clients,eyebrow:value}})))}{extra('clients.heading','Heading',pending.clients.heading,60,value=>editorial.change(previous=>({...previous,clients:{...previous.clients,heading:value}})),true)}</div>{extra('clients.description','Deskripsi',pending.clients.description,380,value=>editorial.change(previous=>({...previous,clients:{...previous.clients,description:value}})),true,6)}<TextListEditor id="collaborator-types" label="Jenis kolaborator" items={pending.clients.types} onChange={items=>editorial.change(previous=>({...previous,clients:{...previous.clients,types:items}}))} disabled={disabled||!editorialReady} max={5} limit={25}/>
          {!editorialReady&&<PendingEditorial>Teks Clients & Collaborators dan jenis kolaborator menunggu aktivasi penyimpanan.</PendingEditorial>}
          <div className="cms-editorial-partners"><h3>Our Partners</h3>{field('partnersHeading','Heading Partner',draft.partnersHeading,saved.edit.partnersHeading,30,value=>editor.change(previous=>({...previous,partnersHeading:value})))}{!saved.managedPartners&&<p className="cms-editorial-rollout">Partner dapat disiapkan di bawah. Film roll publik tetap menggunakan logo saat ini sampai koleksi yang dikelola diaktifkan.</p>}<CollectionManager kind="partners" onDirtyChange={setRecordDirty}/></div>
        </EditorialPanel>
      </div><Notice error={editor.saveError||editorial.saveError}/>{(editor.saveError||editorial.saveError) instanceof Error&&<button className="cms-button secondary" type="button" onClick={()=>{editor.reload();editorial.reload();}}>Muat ulang konten tersimpan</button>}<EditorialSaveBar form={formId} dirty={editor.dirty||editorialReady&&editorial.dirty} busy={editor.busy||editorial.busy} canEdit={canEdit} onDiscard={()=>setDiscard(true)}/>
    </>}
    {discard&&<ConfirmDialog title="Batalkan perubahan About Us?" confirmLabel="Buang perubahan" onCancel={()=>setDiscard(false)} onConfirm={()=>{editor.reset();editorial.reset();setDiscard(false);}}><p>Konten formulir akan kembali ke nilai tersimpan.</p></ConfirmDialog>}{element}
  </div>;
}
