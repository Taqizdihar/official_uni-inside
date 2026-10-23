import {useEffect,useState} from 'react';
import {useBeforeUnload} from 'react-router-dom';
import {api,ApiError} from '../api/client';
import {setEditorDirty} from '../dirty';
import type {ValidationIssue} from '../../../backend/src/contracts/aboutTeam';

export function useFixedEditor<T,D extends {edit:T;version:string}>(path:string,canView:boolean,canEdit:boolean,validate:(next:T,old:T)=>ValidationIssue[]){
  const [saved,setSaved]=useState<D|null>(null),[draft,setDraft]=useState<T|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null),[saveError,setSaveError]=useState<unknown>(null),[issues,setIssues]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
  const dirty=Boolean(saved&&draft&&JSON.stringify(saved.edit)!==JSON.stringify(draft));
  useEffect(()=>{if(!canView){setLoading(false);return;}const controller=new AbortController();setLoading(true);setError(null);api<D>(path,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setSaved(result.data);setDraft(structuredClone(result.data.edit));}}).catch(cause=>{if(!controller.signal.aborted)setError(cause);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[path,canView,retry]);
  const change=(update:(previous:T)=>T)=>{setDraft(previous=>previous?update(previous):previous);setIssues({});setSaveError(null);};
  async function save(){if(!saved||!draft||!dirty||!canEdit||busy)return false;const errors=validate(draft,saved.edit);if(errors.length){setIssues(Object.fromEntries(errors.map(item=>[item.path,item.message])));return false;}setBusy(true);setSaveError(null);try{const result=(await api<D>(path,{method:'PATCH',body:JSON.stringify({edit:draft,expectedVersion:saved.version})})).data;setSaved(result);setDraft(structuredClone(result.edit));setIssues({});return true;}catch(cause){setSaveError(cause);setIssues(Object.fromEntries(((cause as ApiError).details??[]).filter(item=>item.path).map(item=>[item.path!,item.message??'Periksa isian.'])));return false;}finally{setBusy(false);}}
  return {saved,draft,loading,error,saveError,issues,busy,dirty,change,save,reload:()=>setRetry(value=>value+1),reset:()=>{if(saved)setDraft(structuredClone(saved.edit));setIssues({});setSaveError(null);}};
}
export function useEditorialUnsaved(dirty:boolean){
  useBeforeUnload(event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  useEffect(()=>{setEditorDirty(dirty);return()=>setEditorDirty(false);},[dirty]);
}
