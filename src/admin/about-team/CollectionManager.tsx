import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {ExternalLink,Plus,Search,Users,Handshake,Eye} from 'lucide-react';
import {RiGithubLine,RiInstagramLine,RiLinkedinLine,RiTwitterXLine} from 'react-icons/ri';
import {api,query,ApiError} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {CmsModal,ConfirmDialog,Empty,Loading,Notice,Pagination,useToast} from '../components/Ui';
import {MediaPicker,mediaUrl,type Media} from '../components/MediaPicker';
import {EditorialField} from './EditorControls';
import {memberSocialColumns,safeMemberProfile,validatePartner,validateTeamMember,type CollectionStatus,type MemberSocialColumn,type PartnerInput,type TeamMemberInput} from '../../../backend/src/contracts/aboutTeam';

type Kind='team-members'|'partners';
type Image=Pick<Media,'id'|'secure_url'|'alt_text'|'format'|'width_px'|'height_px'>;
export type ManagedCard={id:number;status:CollectionStatus;image:Image|null}&Partial<TeamMemberInput&PartnerInput>;
const formats=['jpg','jpeg','png','webp','avif'] as const;
const profiles=[
  {column:'linkedin_url',name:'LinkedIn',Icon:RiLinkedinLine},
  {column:'instagram_url',name:'Instagram',Icon:RiInstagramLine},
  {column:'x_url',name:'X',Icon:RiTwitterXLine},
  {column:'github_url',name:'GitHub',Icon:RiGithubLine},
] as const;
const endpoint=(kind:Kind)=>kind==='team-members'?'/admin/homepage/team/members':'/admin/homepage/about/partners';

function CardEditor({kind,record,onClose,onSaved,onDirtyChange}:{kind:Kind;record:ManagedCard|null;onClose:()=>void;onSaved:(warnings:string[])=>void;onDirtyChange:(dirty:boolean)=>void}){
  const team=kind==='team-members',scope=team?'team':'partners';
  const {has}=useAuth();
  const canPublish=has(`${scope}.publish`),canEdit=has(`${scope}.${record?'update':'create'}`)&&(!record||record.status==='draft'||canPublish);
  const [member,setMember]=useState<TeamMemberInput>(()=>({full_name:record?.full_name??'',role_title:record?.role_title??'',short_bio:record?.short_bio??'',photo_media_id:record?.photo_media_id??0,status:record?.status??'draft',linkedin_url:record?.linkedin_url??null,instagram_url:record?.instagram_url??null,x_url:record?.x_url??null,github_url:record?.github_url??null}));
  const [partner,setPartner]=useState<PartnerInput>(()=>({name:record?.name??'',logo_media_id:record?.logo_media_id??0,website_url:record?.website_url??null,status:record?.status??'draft'}));
  const initial=useRef(JSON.stringify(team?member:partner));
  const [platforms,setPlatforms]=useState<MemberSocialColumn[]>(()=>memberSocialColumns.filter(column=>Boolean(record?.[column])));
  const [image,setImage]=useState<Image|null>(record?.image??null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[issues,setIssues]=useState<Record<string,string>>({}),[discard,setDiscard]=useState(false),[back,setBack]=useState(false),[overflow,setOverflow]=useState(false);
  const previewText=useRef<HTMLDivElement>(null),dirty=JSON.stringify(team?member:partner)!==initial.current;
  useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
  useEffect(()=>{const node=previewText.current;if(!node)return;const measure=()=>setOverflow(node.scrollHeight>node.clientHeight+2);measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[member.full_name,member.role_title,member.short_bio,back]);
  function changeMember<K extends keyof TeamMemberInput>(key:K,value:TeamMemberInput[K]){setMember(current=>({...current,[key]:value}));setIssues({});setError(null);}
  function changePartner<K extends keyof PartnerInput>(key:K,value:PartnerInput[K]){setPartner(current=>({...current,[key]:value}));setIssues({});setError(null);}
  function close(){if(busy)return;if(dirty)setDiscard(true);else onClose();}
  async function save(event:FormEvent){
    event.preventDefault();event.stopPropagation();if(busy||!canEdit)return;
    const input=team?member:partner,errors=team?validateTeamMember(member):validatePartner(partner);
    if(errors.length){setIssues(Object.fromEntries(errors.map(item=>[item.path,item.message])));return;}
    setBusy(true);setError(null);
    try{const result=await api<{record:ManagedCard;warnings:string[]}>(`${endpoint(kind)}${record?`/${record.id}`:''}`,{method:record?'PATCH':'POST',body:JSON.stringify(input)});onSaved(result.data.warnings);}
    catch(cause){setError(cause);setIssues(Object.fromEntries(((cause as ApiError).details??[]).filter(item=>item.path).map(item=>[item.path!,item.message??'Periksa isian.'])));}
    finally{setBusy(false);}
  }
  if(discard)return <ConfirmDialog title="Buang perubahan?" onCancel={()=>setDiscard(false)} onConfirm={onClose} confirmLabel="Buang perubahan"><p>Isian yang belum disimpan akan hilang.</p></ConfirmDialog>;
  const selectedStatus=team?member.status:partner.status;
  return <CmsModal title={`${record?canEdit?'Edit':'Lihat':'Tambah'} ${team?'Kartu Anggota':'Partner'}`} icon={team?Users:Handshake} className="cms-editorial-modal" onClose={close} busy={busy}>
    <form onSubmit={event=>void save(event)} noValidate className="cms-editorial-record-form">
      <div className="cms-editorial-record-layout"><div className="cms-editorial-record-fields">
        <div className="cms-editorial-media-field"><label>{team?'Foto Kartu':'Logo / Foto Partner'} <span>Wajib</span></label><MediaPicker value={(team?member.photo_media_id:partner.logo_media_id)||null} onChange={id=>team?changeMember('photo_media_id',id??0):changePartner('logo_media_id',id??0)} scope={team?'team':'partners'} allowUpload={false} disabled={busy||!canEdit||!has('media.view')} formats={formats} onMediaChange={setImage}/>
          {team&&<p><strong>1080 × 1350 px · rasio 4:5.</strong> Gunakan gambar desain kartu yang sudah jadi.</p>}
          <Link to="/admin/media" target="_blank" rel="noopener noreferrer">Buka Manajemen Aset <ExternalLink size={13}/></Link>
          {image&&team&&(image.width_px!==1080||image.height_px!==1350)&&<p className="cms-editorial-warning" role="status">{image.width_px&&image.height_px?`Ukuran gambar ${image.width_px} × ${image.height_px} px.`:'Metadata ukuran belum tersedia.'} Periksa pratinjau; ukuran yang disarankan 1080 × 1350 px.</p>}
          {issues[team?'photo_media_id':'logo_media_id']&&<small className="cms-field-error" role="alert">{issues[team?'photo_media_id':'logo_media_id']}</small>}
        </div>
        {team?<>
          <EditorialField id="member-name" label="Nama Anggota" value={member.full_name} limit={150} disabled={busy||!canEdit} error={issues.full_name} onChange={value=>changeMember('full_name',value)}/>
          <EditorialField id="member-role" label="Jabatan / Role" value={member.role_title} limit={190} disabled={busy||!canEdit} error={issues.role_title} onChange={value=>changeMember('role_title',value)}/>
          <EditorialField id="member-bio" label="Deskripsi" value={member.short_bio} limit={1000} multiline rows={4} disabled={busy||!canEdit} error={issues.short_bio} onChange={value=>changeMember('short_bio',value)}/>
          <div className="cms-editorial-member-socials"><label>Media Sosial <span>Opsional · profil pribadi anggota</span></label><div className="cms-editorial-platforms" role="group" aria-label="Pilih platform profil anggota">{profiles.map(({column,name,Icon})=><button key={column} type="button" aria-label={name} title={name} aria-pressed={platforms.includes(column)} disabled={busy||!canEdit} onClick={()=>{if(platforms.includes(column)){setPlatforms(current=>current.filter(value=>value!==column));changeMember(column,null);}else{setPlatforms(current=>[...current,column]);changeMember(column,'');}}}><Icon size={23}/></button>)}</div>{profiles.filter(item=>platforms.includes(item.column)).map(({column,name,Icon})=><div className="cms-editorial-profile-row" key={column}><label htmlFor={`member-${column}`}><Icon size={18}/><span className="cms-sr-only">URL {name}</span></label><input id={`member-${column}`} value={member[column]??''} placeholder={`URL profil ${name}`} disabled={busy||!canEdit} onChange={event=>changeMember(column,event.target.value)} aria-invalid={Boolean(issues[column])}/><button type="button" className="cms-button secondary" disabled={busy||!canEdit} onClick={()=>{setPlatforms(current=>current.filter(value=>value!==column));changeMember(column,null);}}>Hapus</button>{issues[column]&&<small className="cms-field-error" role="alert">{issues[column]}</small>}</div>)}</div>
        </>:<>
          <EditorialField id="partner-name" label="Nama Partner" value={partner.name} limit={150} disabled={busy||!canEdit} error={issues.name} onChange={value=>changePartner('name',value)}/>
          <EditorialField id="partner-url" label="URL Partner" value={partner.website_url??''} limit={1000} required={false} disabled={busy||!canEdit} error={issues.website_url} onChange={value=>changePartner('website_url',value||null)}/>
        </>}
        <div className="cms-editorial-field"><label htmlFor="collection-status">Status publikasi</label><select id="collection-status" value={selectedStatus} disabled={!canEdit||busy||!canPublish} onChange={event=>team?changeMember('status',event.target.value as CollectionStatus):changePartner('status',event.target.value as CollectionStatus)}><option value="draft">Draft</option><option value="published">Terbit</option>{record?.status==='archived'&&<option value="archived">Arsip</option>}</select>{!canPublish&&<small>Penerbit akan meninjau kartu sebelum ditampilkan di website.</small>}</div>
      </div><aside className="cms-editorial-preview"><div className="cms-editorial-preview-heading"><strong>Pratinjau {team?'kartu':'logo'}</strong>{team&&<button className="cms-button secondary" type="button" onClick={()=>setBack(value=>!value)}>{back?'Lihat depan':'Lihat belakang'}</button>}</div>
        {team?<div className={`cms-editorial-card-preview ${back?'back':''}`}>{back?<><div ref={previewText} className="cms-editorial-preview-text"><h3>{member.full_name||'Nama Anggota'}</h3><strong>{member.role_title||'Jabatan / Role'}</strong><p>{member.short_bio||'Deskripsi anggota akan ditampilkan di sini.'}</p></div><div className="cms-editorial-preview-socials">{profiles.filter(({column})=>member[column]&&safeMemberProfile(member[column]!,column)).map(({column,name,Icon})=><Icon key={column} aria-label={name} size={18}/>)}</div></>:image?<img src={mediaUrl(image.secure_url,400)} alt={image.alt_text||'Pratinjau foto kartu'}/>:<div className="cms-editorial-preview-empty"><Users size={38}/><p>Pilih foto kartu<br/>1080 × 1350 px</p></div>}</div>:<div className="cms-editorial-partner-preview">{image?<img src={mediaUrl(image.secure_url,400)} alt={partner.name||'Pratinjau logo'}/>:<Handshake size={44}/>}</div>}
        {team&&<small>Gambar depan tampil utuh sebagai desain kartu. Nama, role, dan deskripsi tampil di sisi belakang.</small>}{overflow&&<p className="cms-editorial-warning" role="status">Teks melebihi area kartu. Bagian belakang dapat digulir; pertimbangkan deskripsi yang lebih ringkas.</p>}
      </aside></div><Notice error={error}/><div className="cms-editorial-modal-actions"><button className="cms-button secondary" type="button" disabled={busy} onClick={close}>Batal</button>{canEdit&&<button className="cms-button primary" type="submit" disabled={busy||!dirty&&Boolean(record)}>{busy?'Menyimpan…':selectedStatus==='published'?'Simpan dan terbitkan':'Simpan draft'}</button>}</div>
    </form>
  </CmsModal>;
}

export function CollectionManager({kind,onDirtyChange}:{kind:Kind;onDirtyChange:(dirty:boolean)=>void}){
  const team=kind==='team-members',scope=team?'team':'partners',{has}=useAuth(),canView=has(`${scope}.view`);
  const [items,setItems]=useState<ManagedCard[]>([]),[page,setPage]=useState(1),[pages,setPages]=useState(1),[search,setSearch]=useState(''),[debounced,setDebounced]=useState(''),[status,setStatus]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null),[retry,setRetry]=useState(0),[editing,setEditing]=useState<ManagedCard|null|false>(false),[removing,setRemoving]=useState<ManagedCard|null>(null),[busy,setBusy]=useState(false);
  const {toast,element}=useToast();
  useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setPage(1);},250);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{if(!canView){setLoading(false);return;}const controller=new AbortController();setLoading(true);setError(null);api<ManagedCard[]>(`${endpoint(kind)}?${query({page,limit:12,search:debounced||undefined,status:status||undefined})}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setItems(result.data);setPages(result.meta?.totalPages??1);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[kind,canView,page,debounced,status,retry]);
  async function remove(){if(!removing||busy)return;setBusy(true);try{await api(`${endpoint(kind)}/${removing.id}`,{method:'DELETE'});setRemoving(null);setRetry(value=>value+1);toast(`${team?'Kartu anggota':'Partner'} berhasil dihapus.`);}catch(cause){setError(cause);setRemoving(null);}finally{setBusy(false);}}
  if(!canView)return <div className="cms-editorial-readonly">Anda tidak memiliki izin melihat {team?'kartu anggota':'Partner'}.</div>;
  return <div className="cms-editorial-collection"><div className="cms-editorial-collection-heading"><div><h3>{team?'Manajemen Kartu Anggota':'Manajemen Partner'}</h3><p>{team?'Anggota website, terpisah dari akun login CMS.':'Logo Partner yang disiapkan untuk film roll About Us.'}</p></div>{has(`${scope}.create`)&&<button type="button" className="cms-button primary" onClick={()=>setEditing(null)}><Plus size={17}/>{team?'Tambah Anggota':'Tambah Partner'}</button>}</div><div className="cms-editorial-filters"><label><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder={team?'Cari nama anggota':'Cari nama Partner'} aria-label={team?'Cari nama anggota':'Cari nama Partner'}/></label><select value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}} aria-label="Filter status"><option value="">Semua status</option><option value="draft">Draft</option><option value="published">Terbit</option><option value="archived">Arsip</option></select></div><Notice error={error}/>{error&&<button type="button" className="cms-button secondary" onClick={()=>setRetry(value=>value+1)}>Coba lagi</button>}{loading?<Loading/>:!items.length?<Empty>Belum ada {team?'kartu anggota':'Partner'} yang cocok.</Empty>:<div className={`cms-editorial-card-grid ${team?'team':'partners'}`}>{items.map(item=><article key={item.id} className="cms-editorial-managed-card"><div className="cms-editorial-managed-image">{item.image?<img src={mediaUrl(item.image.secure_url,360)} alt={item.image.alt_text||String(team?item.full_name:item.name)} loading="lazy"/>:team?<Users size={36}/>:<Handshake size={36}/>}</div><div className="cms-editorial-managed-copy"><span className={`cms-badge ${item.status}`}>{item.status==='published'?'Terbit':item.status==='archived'?'Arsip':'Draft'}</span><h4>{team?item.full_name:item.name}</h4>{team&&<p>{item.role_title}</p>}<div className="cms-editorial-card-actions"><button type="button" className="cms-button secondary" onClick={()=>setEditing(item)}><Eye size={15}/>{has(`${scope}.update`)&&(item.status==='draft'||has(`${scope}.publish`))?'Edit':'Lihat'}</button>{has(`${scope}.archive`)&&<button type="button" className="cms-button danger" onClick={()=>setRemoving(item)}>Hapus</button>}</div></div></article>)}</div>}<Pagination page={page} totalPages={pages} onChange={setPage}/>
    {editing!==false&&<CardEditor key={editing?.id??'new'} kind={kind} record={editing} onClose={()=>setEditing(false)} onDirtyChange={onDirtyChange} onSaved={warnings=>{setEditing(false);setRetry(value=>value+1);toast(`${team?'Kartu anggota':'Partner'} berhasil disimpan.${warnings.length?' '+warnings.join(' '):''}`);}}/>}
    {removing&&<ConfirmDialog title={`Hapus ${team?'kartu anggota':'Partner'}?`} confirmLabel="Hapus" onCancel={()=>setRemoving(null)} onConfirm={()=>void remove()} busy={busy}><p>“{team?removing.full_name:removing.name}” akan dihapus dari daftar aktif. Tindakan ini tidak menghapus gambar dari Manajemen Aset.</p></ConfirmDialog>}{element}
  </div>;
}
