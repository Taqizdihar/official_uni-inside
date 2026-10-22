import {useEffect,useState,type FormEvent} from 'react';
import {Eye,EyeOff,LockKeyhole,Copy} from 'lucide-react';
import {ApiError,api,query} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {auditActionLabel,auditActorLabel,auditEntityLabel,formatCmsUtc,initials,roleDescriptions,roleLabels,statusLabels} from '../copy';
import {CmsModal,ConfirmDialog,Empty,Loading,Notice,Pagination,useToast} from '../components/Ui';
import './administration-access.css';

type User={id:number;display_name:string;email:string;role_code:string;status:string;last_login_at?:string|null};
type Invitation={id:number;email:string;role_code:string;accepted_at:string|null;revoked_at:string|null;expires_at:string};
type Role={id:number;code:string;name:string};
type Audit={id:number;actor_user_id:number|null;actor_name:string|null;action_code:string;entity_type:string|null;entity_id:number|null;target_name:string|null;request_id:string|null;created_at:string};
const manageableRoles=['administrator','editor','author','viewer'];
const canManageUsers=(code?:string)=>code==='super_admin'||code==='administrator';
const strongPassword=(value:string,minLength:number)=>value.length>=minLength&&value.length<=1024&&!/^\s+$/.test(value)&&!/^(password|123456|qwerty)/i.test(value);
const invitationMessage=(action:'invite'|'resend',developmentUrl?:string)=>developmentUrl?'Tautan undangan dibuat untuk lingkungan pengembangan. Email tidak dikirim.':action==='invite'?'Undangan dibuat dan email dikirim.':'Undangan diperbarui dan email dikirim.';
const invitationError=(error:unknown)=>error instanceof ApiError&&error.code==='INTEGRATION_NOT_CONFIGURED'?new ApiError(error.status,error.code,'Email undangan belum dapat dikirim karena SMTP belum dikonfigurasi. Hubungi pengelola sistem.',error.requestId,error.details):error;

export function UsersPage(){
  const {user,has,passwordMinLength}=useAuth();
  const allowed=canManageUsers(user?.role_code)&&has('users.view');
  const isSuper=user?.role_code==='super_admin';
  const [users,setUsers]=useState<User[]>([]),[invitations,setInvitations]=useState<Invitation[]>([]),[roles,setRoles]=useState<Role[]>([]);
  const [page,setPage]=useState(1),[totalPages,setTotalPages]=useState(0),[reload,setReload]=useState(0);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
  const [email,setEmail]=useState(''),[name,setName]=useState(''),[role,setRole]=useState('viewer');
  const [selected,setSelected]=useState<User|null>(null),[resetTarget,setResetTarget]=useState<User|null>(null),[revokeId,setRevokeId]=useState<number|null>(null);
  const [developmentUrl,setDevelopmentUrl]=useState('');
  const [newPassword,setNewPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[showPassword,setShowPassword]=useState(false),[showConfirmation,setShowConfirmation]=useState(false);
  const {toast,element}=useToast();
  useEffect(()=>{
    if(!allowed)return;
    let current=true;
    setLoading(true);
    Promise.all([api<User[]>(`/admin/users?${query({page,limit:20})}`),api<Invitation[]>('/admin/invitations?limit=100'),has('roles.view')?api<Role[]>('/admin/roles'):Promise.resolve({data:[] as Role[]})])
      .then(([members,invites,availableRoles])=>{if(!current)return;setUsers(members.data);setTotalPages(members.meta?.totalPages??0);setInvitations(invites.data);setRoles(availableRoles.data.length?availableRoles.data:['super_admin',...manageableRoles].map((code,id)=>({id,code,name:roleLabels[code]})));setError(null);})
      .catch(e=>{if(current)setError(e);}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[allowed,has,page,reload]);
  if(!allowed)return <div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki akses ke Manajemen Pengguna.</div>;
  const selfLocked=selected?.id===user?.id&&isSuper;
  const protectedAdmin=selected?.role_code==='super_admin'&&!isSuper;
  const editAllowed=has('users.update')&&!protectedAdmin;
  const canReset=(target:User)=>isSuper&&has('users.update')&&target.id!==user?.id&&target.role_code!=='super_admin'&&target.status!=='invited';
  const closeReset=()=>{if(busy)return;setResetTarget(null);setNewPassword('');setConfirmation('');setShowPassword(false);setShowConfirmation(false);setError(null);};
  async function invite(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError(null);
    try{const result=await api<{developmentUrl?:string}>('/admin/invitations',{method:'POST',body:JSON.stringify({email,displayName:name,role})});setDevelopmentUrl(result.data.developmentUrl??'');setEmail('');setName('');setReload(value=>value+1);toast(invitationMessage('invite',result.data.developmentUrl));}
    catch(e){setError(invitationError(e));}finally{setBusy(false);}
  }
  async function updateUser(){
    if(!selected||busy||selfLocked||protectedAdmin)return;setBusy(true);setError(null);
    try{await api(`/admin/users/${selected.id}`,{method:'PATCH',body:JSON.stringify({role:selected.role_code,status:selected.status})});setSelected(null);setReload(value=>value+1);toast('Pengguna berhasil diperbarui.');}
    catch(e){setError(e);}finally{setBusy(false);}
  }
  async function invitationAction(id:number,action:'resend'|'revoke'){
    if(busy)return;setBusy(true);setError(null);
    try{const result=await api<{developmentUrl?:string}>(`/admin/invitations/${id}/${action}`,{method:'POST'});setDevelopmentUrl(result.data.developmentUrl??'');setReload(value=>value+1);toast(action==='revoke'?'Undangan dibatalkan.':invitationMessage('resend',result.data.developmentUrl));setRevokeId(null);}
    catch(e){setError(action==='resend'?invitationError(e):e);}finally{setBusy(false);}
  }
  async function resetPassword(event:FormEvent){
    event.preventDefault();if(!resetTarget||busy||!strongPassword(newPassword,passwordMinLength)||newPassword!==confirmation)return;
    setBusy(true);setError(null);
    try{await api(`/admin/users/${resetTarget.id}/reset-password`,{method:'POST',body:JSON.stringify({newPassword})});setBusy(false);closeReset();toast('Password anggota berhasil diperbarui. Semua sesi login sebelumnya telah diakhiri.');}
    catch(e){setError(e);setBusy(false);}
  }
  return <div className="cms-page cms-administration-page">
    <div className="cms-page-head"><div><span className="cms-eyebrow">ADMINISTRASI</span><h1>Manajemen Pengguna</h1><p>Undang anggota tim, kelola akun, dan atur hak akses pengguna CMS.</p></div></div>
    {!selected&&!resetTarget&&<Notice error={error}/>}
    {developmentUrl&&<div className="cms-notice"><div><strong>Tautan undangan pengembangan</strong><p>Email tidak dikirim. Tautan ini hanya tersedia di lingkungan pengembangan.</p><a href={developmentUrl}>{developmentUrl}</a></div></div>}
    {has('users.invite')&&<form className="cms-card cms-invite-card" onSubmit={invite}>
      <div className="cms-section-heading"><h2>Undang anggota tim</h2><p>Berikan akses sesuai tanggung jawab anggota.</p></div>
      <div className="cms-invite-grid">
        <div className="cms-field"><label>Email<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label></div>
        <div className="cms-field"><label>Nama tampilan<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label></div>
        <div className="cms-field cms-invite-role"><label>Role<select value={role} onChange={e=>setRole(e.target.value)} disabled={busy}>{roles.filter(item=>item.code!=='super_admin').map(item=><option key={item.code} value={item.code}>{roleLabels[item.code]??item.name}</option>)}</select></label><small>{roleDescriptions[role]}</small></div>
      </div>
      <div className="cms-invite-actions"><button className="cms-button primary" disabled={busy}>{busy?'Memproses…':'Kirim undangan'}</button></div>
    </form>}
    {loading?<Loading/>:<>
      <section className="cms-card cms-administration-table"><div className="cms-section-heading"><h2>Anggota tim</h2><p>Akun yang terdaftar dan waktu masuk terakhir.</p></div>
        {users.length?<div className="cms-table-wrap"><table><thead><tr><th>Pengguna</th><th>Email</th><th>Role</th><th>Status</th><th>Masuk Terakhir</th><th>Aksi</th></tr></thead><tbody>{users.map(item=><tr key={item.id}><td><span className="cms-user-cell"><span className="cms-avatar">{initials(item.display_name)}</span><strong title={item.display_name}>{item.display_name}</strong></span></td><td title={item.email}>{item.email}</td><td>{roleLabels[item.role_code]??item.role_code}</td><td><span className={`cms-badge ${item.status}`}>{statusLabels[item.status]??item.status}</span></td><td>{item.last_login_at?formatCmsUtc(item.last_login_at):'Belum pernah masuk'}</td><td>{has('users.update')&&(isSuper||item.role_code!=='super_admin')&&<button type="button" className="cms-button secondary" onClick={()=>{setSelected({...item});setError(null);}}>Edit</button>}</td></tr>)}</tbody></table></div>:<Empty>Belum ada anggota tim.</Empty>}<Pagination page={page} totalPages={totalPages} onChange={setPage}/></section>
      <section className="cms-card cms-administration-table"><div className="cms-section-heading"><h2>Undangan</h2><p>Status undangan yang pernah dibuat.</p></div>{invitations.length?<div className="cms-table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Kedaluwarsa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{invitations.map(item=><tr key={item.id}><td>{item.email}</td><td>{roleLabels[item.role_code]??item.role_code}</td><td>{formatCmsUtc(item.expires_at)}</td><td>{item.accepted_at?'Diterima':item.revoked_at?'Dibatalkan':'Menunggu'}</td><td>{!item.accepted_at&&!item.revoked_at&&has('users.invite')&&<div className="cms-actions"><button type="button" className="cms-button secondary" disabled={busy} onClick={()=>void invitationAction(item.id,'resend')}>Kirim ulang</button><button type="button" className="cms-button secondary" disabled={busy} onClick={()=>setRevokeId(item.id)}>Batalkan</button></div>}</td></tr>)}</tbody></table></div>:<Empty>Belum ada undangan.</Empty>}</section>
    </>}
    {selected&&<CmsModal title="Edit anggota tim" onClose={()=>{if(!busy){setSelected(null);setError(null);}}} busy={busy} actions={<><button type="button" className="cms-button secondary" disabled={busy} onClick={()=>setSelected(null)}>Tutup</button>{editAllowed&&!selfLocked&&<button type="button" className="cms-button primary" disabled={busy} onClick={()=>void updateUser()}>Simpan perubahan</button>}</>}>
      <div className="cms-edit-identity"><strong>{selected.display_name}</strong><span>{selected.email}</span></div>
      <Notice error={error}/>
      <div className="cms-field"><label>Role<select value={selected.role_code} disabled={selfLocked||protectedAdmin||!editAllowed||busy} onChange={e=>setSelected({...selected,role_code:e.target.value})}>{roles.filter(item=>item.code!=='super_admin'||isSuper).map(item=><option key={item.code} value={item.code}>{roleLabels[item.code]??item.name}</option>)}</select></label></div>
      <div className="cms-field"><label>Status akun<select value={selected.status} disabled={selfLocked||protectedAdmin||!editAllowed||busy} onChange={e=>setSelected({...selected,status:e.target.value})}><option value="active">Aktif</option><option value="suspended">Ditangguhkan</option><option value="disabled">Nonaktif</option></select></label></div>
      {selfLocked?<p className="cms-edit-help"><LockKeyhole size={16}/> Role dan status akun Super Administrator Anda dikunci dan tidak dapat diubah melalui Manajemen Pengguna.</p>:<p className="cms-edit-help">Mengubah status akun dapat membatasi akses anggota ini.</p>}
      {canReset(selected)&&<div className="cms-reset-entry"><strong>Pemulihan akun</strong><p>Setel password baru dan akhiri seluruh sesi login anggota ini.</p><button type="button" className="cms-button secondary" onClick={()=>{setResetTarget(selected);setSelected(null);setError(null);}}>Reset Password</button></div>}
    </CmsModal>}
    {resetTarget&&<CmsModal title="Reset Password Anggota" onClose={closeReset} busy={busy} actions={<><button type="button" className="cms-button secondary" disabled={busy} onClick={closeReset}>Batal</button><button form="cms-admin-reset-form" type="submit" className="cms-button primary" disabled={busy||!strongPassword(newPassword,passwordMinLength)||newPassword!==confirmation}>{busy?'Memproses…':'Reset password'}</button></>}>
      <p>Tetapkan password baru untuk anggota ini. Semua sesi login anggota tersebut akan diakhiri setelah password berhasil diperbarui.</p>
      <div className="cms-edit-identity"><strong>{resetTarget.display_name}</strong><span>{resetTarget.email}</span></div>
      <Notice error={error}/>
      <form id="cms-admin-reset-form" onSubmit={e=>void resetPassword(e)} className="cms-reset-form">
        <div className="cms-field"><label>Password baru<div className="cms-password"><input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={passwordMinLength} maxLength={1024} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/><button type="button" aria-label={showPassword?'Sembunyikan password baru':'Tampilkan password baru'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label></div>
        <div className="cms-field"><label>Konfirmasi password baru<div className="cms-password"><input type={showConfirmation?'text':'password'} autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/><button type="button" aria-label={showConfirmation?'Sembunyikan konfirmasi password':'Tampilkan konfirmasi password'} onClick={()=>setShowConfirmation(!showConfirmation)}>{showConfirmation?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label></div>
        <small>Gunakan {passwordMinLength}–1024 karakter. Hindari password mudah ditebak seperti “password”, “123456”, atau “qwerty”.</small>
        {confirmation&&newPassword!==confirmation&&<p className="cms-field-error" role="alert">Konfirmasi password belum cocok.</p>}
      </form>
    </CmsModal>}
    {revokeId!==null&&<ConfirmDialog title="Batalkan undangan?" confirmLabel="Batalkan undangan" busy={busy} onCancel={()=>setRevokeId(null)} onConfirm={()=>void invitationAction(revokeId,'revoke')}><p>Tautan undangan ini akan berhenti berfungsi.</p></ConfirmDialog>}
    {element}
  </div>;
}

export function AuditPage(){
  const [page,setPage]=useState(1),[data,setData]=useState<Audit[]>([]),[totalPages,setTotalPages]=useState(0);
  const [loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null),[copied,setCopied]=useState<number|null>(null);
  useEffect(()=>{
    const controller=new AbortController();let current=true;setLoading(true);
    api<Audit[]>(`/admin/audit?${query({page,limit:20})}`,{signal:controller.signal})
      .then(result=>{if(current){setData(result.data);setTotalPages(result.meta?.totalPages??0);setError(null);}})
      .catch(e=>{if(current&&(e as ApiError).code!=='NETWORK_ERROR')setError(e);})
      .finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;controller.abort();};
  },[page]);
  async function copy(id:number,value:string){try{await navigator.clipboard.writeText(value);setCopied(id);}catch{setError(new Error('ID permintaan tidak dapat disalin.'));}}
  return <div className="cms-page cms-administration-page cms-audit-page"><div className="cms-page-head"><div><span className="cms-eyebrow">ADMINISTRASI</span><h1>Riwayat Aktivitas</h1><p>Lihat perubahan dan tindakan yang tercatat di CMS. Waktu ditampilkan dalam WIB.</p></div></div>
    <Notice error={error}/>
    <section className="cms-card cms-administration-table"><div className="cms-section-heading"><h2>Aktivitas terbaru</h2><p>Catatan tersusun dari yang terbaru.</p></div>
      {loading?<Loading/>:data.length?<div className="cms-table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Konten</th><th>ID Permintaan</th></tr></thead><tbody>{data.map(item=><tr key={item.id}><td>{formatCmsUtc(item.created_at)}</td><td title={item.actor_name??undefined}>{auditActorLabel(item.actor_user_id,item.actor_name)}</td><td>{auditActionLabel(item.action_code)}</td><td title={item.target_name??undefined}>{auditEntityLabel(item.entity_type)}{item.target_name?`: ${item.target_name}`:''}</td><td>{item.request_id?<div className="cms-request-id"><code title={item.request_id}>{item.request_id}</code><button type="button" className="cms-icon-button" aria-label={`Salin ID permintaan ${item.request_id}`} onClick={()=>void copy(item.id,item.request_id!)}><Copy size={15}/></button>{copied===item.id&&<span className="cms-sr-only" role="status">ID permintaan disalin.</span>}</div>:'—'}</td></tr>)}</tbody></table></div>:<Empty>Belum ada aktivitas yang tercatat.</Empty>}
      <Pagination page={page} totalPages={totalPages} onChange={setPage}/></section>
  </div>;
}
