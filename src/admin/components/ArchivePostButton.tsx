import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {ConfirmDialog,Notice} from './Ui';

export function ArchivePostButton({kind,id,onArchived}:{kind:'products'|'services'|'news';id?:number;onArchived:()=>void}){
  const {has}=useAuth(),navigate=useNavigate();
  const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
  if(!id||!has(`${kind}.archive`))return null;
  async function archive(){
    setBusy(true);setError(null);
    try{await api(`/admin/${kind}/${id}`,{method:'PATCH',body:JSON.stringify({status:'archived'})});onArchived();navigate(`/admin/content/${kind}`);}
    catch(cause){setError(cause);setConfirm(false);}
    finally{setBusy(false);}
  }
  return <><button type="button" className="cms-button secondary" disabled={busy} onClick={()=>setConfirm(true)}>Arsipkan</button><Notice error={error}/>{confirm&&<ConfirmDialog title="Arsipkan konten ini?" confirmLabel="Arsipkan" onCancel={()=>setConfirm(false)} onConfirm={()=>void archive()} busy={busy}><p>Konten akan disembunyikan dari pengunjung. Perubahan yang belum disimpan akan hilang.</p></ConfirmDialog>}</>;
}
