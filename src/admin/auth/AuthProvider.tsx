import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {api,clearCsrfToken,setCsrfToken,type ApiError} from '../api/client';

export type CmsUser={id:number;email:string;display_name:string;role_code:string;status:string};
type AuthState={user:CmsUser|null;permissions:Set<string>;loading:boolean;offline:boolean;refresh:()=>Promise<void>;login:(email:string,password:string)=>Promise<void>;logout:(all?:boolean)=>Promise<void>;has:(permission:string)=>boolean};
const AuthContext=createContext<AuthState|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<CmsUser|null>(null);
  const [permissions,setPermissions]=useState<Set<string>>(new Set());
  const [loading,setLoading]=useState(true);
  const [offline,setOffline]=useState(false);
  const clear=useCallback(()=>{setUser(null);setPermissions(new Set());clearCsrfToken();},[]);
  const refresh=useCallback(async()=>{
    try{const result=await api<{user:CmsUser;permissions:string[];csrfToken:string}>('/auth/me');setUser(result.data.user);setPermissions(new Set(result.data.permissions));setCsrfToken(result.data.csrfToken);setOffline(false);}
    catch(error){clear();setOffline((error as ApiError).status===0);}
    finally{setLoading(false);}
  },[clear]);
  useEffect(()=>{void refresh();const onExpired=()=>clear();window.addEventListener('cms:session-expired',onExpired);return()=>window.removeEventListener('cms:session-expired',onExpired);},[refresh,clear]);
  const login=useCallback(async(email:string,password:string)=>{
    const result=await api<{csrfToken:string}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});setCsrfToken(result.data.csrfToken);await refresh();
  },[refresh]);
  const logout=useCallback(async(all=false)=>{try{await api(all?'/auth/logout-all':'/auth/logout',{method:'POST'});}finally{clear();}},[clear]);
  const value=useMemo(()=>({user,permissions,loading,offline,refresh,login,logout,has:(permission:string)=>permissions.has(permission)}),[user,permissions,loading,offline,refresh,login,logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('CMS auth is unavailable');return value;}
