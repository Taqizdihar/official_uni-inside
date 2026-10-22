import {useEffect,useState} from 'react';
import {api} from '../api/client';
import './CmsButtonDestinationField.css';

export type LinkDestination={label:string;url:string};
let cached:LinkDestination[]|null=null;
export function CmsButtonDestinationField({id,value,onChange,disabled,error,label='Tujuan Tombol'}:{id:string;value:string;onChange:(value:string)=>void;disabled:boolean;error?:string;label?:string}){
  const [options,setOptions]=useState<LinkDestination[]>(cached??[]),[loading,setLoading]=useState(!cached),[loadError,setLoadError]=useState(false),[manual,setManual]=useState(false);
  useEffect(()=>{if(cached)return;let active=true;api<LinkDestination[]>('/admin/link-destinations').then(result=>{cached=result.data;if(active)setOptions(result.data);}).catch(()=>{if(active)setLoadError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const listed=options.some(option=>option.url===value);
  const manualMode=manual||(!loading&&!listed&&Boolean(value));
  return <div className="cms-hero-field cms-destination"><label htmlFor={id}>{label}</label><select id={id} value={manualMode?'__manual__':value} onChange={event=>{if(event.target.value==='__manual__')setManual(true);else{setManual(false);onChange(event.target.value);}}} disabled={disabled||loading} aria-invalid={Boolean(error)}><option value="" disabled>Pilih halaman atau tujuan…</option>{options.map(option=><option key={option.url} value={option.url}>{option.label}</option>)}<option value="__manual__">Input Manual</option></select>{manualMode&&<div className="cms-homepage-manual"><label htmlFor={`${id}-manual`}>Path atau URL HTTPS</label><input id={`${id}-manual`} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)} placeholder="/news atau https://…" aria-invalid={Boolean(error)} /><small>Gunakan path internal /… atau alamat HTTPS tanpa kredensial.</small></div>}{loading&&<small>Memuat tujuan…</small>}{loadError&&<small role="alert">Daftar tujuan belum tersedia. Tujuan tersimpan tetap dapat diedit melalui Input Manual.</small>}{error&&<small className="cms-field-error" role="alert">{error}</small>}</div>;
}
