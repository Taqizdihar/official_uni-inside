import {lazy,Suspense,useEffect,useState} from 'react';
import {Activity,BarChart3,Eye,FilePenLine,History,MousePointerClick,Plus,Users,Zap} from 'lucide-react';
import {api} from '../api/client';
import {useAuth,type CmsUser} from '../auth/AuthProvider';
import {auditActionLabel,domainLabels,formatDate,roleLabels} from '../copy';
import {Empty,Loading,Notice} from '../components/Ui';
const AnalyticsChart=lazy(()=>import('../components/AnalyticsChart'));
type Dashboard={counts:Record<string,{published:number;draft:number}>;month:{events:number;visitors:number};mostViewed:{entity_type:string;entity_id:number;views:number}[];mostClicked:{entity_id:number;link_destination:string;clicks:number}[];recentChanges:{id:number;actor_user_id:number|null;action_code:string;created_at:string}[]};
const number=(value:number)=>new Intl.NumberFormat('id-ID').format(value);

export function DashboardPage(){
  const {user,has}=useAuth();
  const [data,setData]=useState<Dashboard|null>(null);
  const [members,setMembers]=useState<Record<number,CmsUser>>({});
  const [error,setError]=useState<unknown>(null);
  const [loading,setLoading]=useState(true);
  const [retry,setRetry]=useState(0);
  const canViewUsers=has('users.view');
  useEffect(()=>{
    let active=true;setLoading(true);setError(null);
    api<Dashboard>('/admin/dashboard').then(async result=>{
      if(!active)return;
      setData(result.data);
      if(!canViewUsers)return;
      const actorIds=[...new Set(result.data.recentChanges.map(item=>item.actor_user_id).filter((id):id is number=>id!==null&&id!==user?.id))];
      const results=await Promise.allSettled(actorIds.map(id=>api<CmsUser>(`/admin/users/${id}`)));
      if(active)setMembers(Object.fromEntries(results.flatMap((result,index)=>result.status==='fulfilled'?[[actorIds[index],result.value.data]]:[])));
    }).catch(cause=>{if(active){setData(null);setError(cause);}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[retry,canViewUsers,user?.id]);
  if(!has('dashboard.view'))return <div className="cms-notice cms-notice-error">Anda tidak memiliki akses ke Dashboard.</div>;
  const published=Object.values(data?.counts??{}).reduce((total,item)=>total+Number(item.published),0);
  const drafts=Object.values(data?.counts??{}).reduce((total,item)=>total+Number(item.draft),0);
  const stats=[
    {label:'Perkiraan pengunjung bulan ini',value:data?.month.visitors,icon:Users},
    {label:'Interaksi bulan ini',value:data?.month.events,icon:Activity},
    {label:'Konten aktif',value:published,icon:Eye},
    {label:'Konten draf',value:drafts,icon:FilePenLine},
  ];
  return <div className="cms-page cms-dashboard">
    <div className="cms-page-head cms-dashboard-head"><div><h1>Dashboard</h1><p>Ringkasan konten dan aktivitas</p></div><div className="cms-dashboard-quick" aria-label="Aksi Cepat"><span className="cms-dashboard-quick-title"><Zap size={20} aria-hidden="true"/> Aksi Cepat</span><div>{['Produk','Layanan','Artikel'].map(label=><span key={label} className="cms-dashboard-quick-hint" tabIndex={0} title="Form belum tersedia" aria-label={`${label}: Form belum tersedia`}><button type="button" disabled className="cms-dashboard-quick-button"><Plus size={16} aria-hidden="true"/>{label}</button></span>)}</div></div></div>
    {error&&<div><Notice error={error}/><button type="button" className="cms-button secondary" onClick={()=>setRetry(value=>value+1)}>Coba lagi</button></div>}
    {loading?<Loading/>:data&&<>
      <div className="cms-stats cms-dashboard-stats">{stats.map(({label,value,icon:Icon})=><div className="cms-card cms-stat" key={label}><div className="cms-dashboard-stat-line"><Icon size={22} aria-hidden="true"/><span className="cms-stat-value">{number(Number(value??0))}</span></div><span>{label}</span></div>)}</div>
      <div className="cms-grid cms-dashboard-panels">
        <section className="cms-card"><div className="cms-panel-head"><Eye size={21} aria-hidden="true"/><h2>Konten paling banyak dilihat</h2></div>{data.mostViewed.length?<ul className="cms-dashboard-ranking">{data.mostViewed.map((item,index)=>{const value=Number(item.views);const max=Math.max(...data.mostViewed.map(record=>Number(record.views)),1);return <li key={`${item.entity_type}-${item.entity_id}-${index}`}><div><span>{domainLabels[item.entity_type]??item.entity_type} #{item.entity_id}</span><span>{number(value)} tayangan</span></div><span className="cms-dashboard-bar" aria-hidden="true"><span style={{width:`${Math.max(4,value/max*100)}%`}}/></span></li>;})}</ul>:<div className="cms-dashboard-empty"><Eye size={28} aria-hidden="true"/><span>Belum ada tayangan yang tercatat</span></div>}</section>
        <section className="cms-card"><div className="cms-panel-head"><MousePointerClick size={21} aria-hidden="true"/><h2>Klik tautan pembelian</h2></div>{data.mostClicked.length?<ul className="cms-dashboard-ranking">{data.mostClicked.map((item,index)=>{const value=Number(item.clicks);const max=Math.max(...data.mostClicked.map(record=>Number(record.clicks)),1);return <li key={`${item.entity_id}-${item.link_destination}-${index}`}><div><span>{item.link_destination||`Produk #${item.entity_id}`}</span><span>{number(value)} klik</span></div><span className="cms-dashboard-bar" aria-hidden="true"><span style={{width:`${Math.max(4,value/max*100)}%`}}/></span></li>;})}</ul>:<div className="cms-dashboard-empty"><MousePointerClick size={28} aria-hidden="true"/><span>Belum ada klik yang tercatat</span></div>}</section>
      </div>
      <section className="cms-card cms-dashboard-activity"><div className="cms-panel-head"><History size={21} aria-hidden="true"/><h2>Aktivitas Terbaru</h2></div>{data.recentChanges.length?<div className="cms-dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabel aktivitas terbaru, dapat digulir"><table><thead><tr><th scope="col">Aktivitas</th><th scope="col">Nama Anggota</th><th scope="col">Role</th><th scope="col">Tanggal</th></tr></thead><tbody>{data.recentChanges.map(item=>{const actor=item.actor_user_id===user?.id?user:item.actor_user_id!==null?members[item.actor_user_id]:null;return <tr key={item.id}><td>{auditActionLabel(item.action_code)}</td><td>{actor?.display_name??(item.actor_user_id!==null?`Anggota #${item.actor_user_id}`:'Sistem')}</td><td>{actor?(roleLabels[actor.role_code]??actor.role_code):'—'}</td><td>{formatDate(item.created_at)}</td></tr>;})}</tbody></table></div>:<Empty>Belum ada aktivitas terbaru.</Empty>}</section>
    </>}
  </div>;
}
type Metric={metric_date:string;metric_name:string;metric_value:number};
export function AnalyticsPage(){const {has}=useAuth();const [range,setRange]=useState(30);const [data,setData]=useState<Metric[]>([]);const [error,setError]=useState<unknown>(null);const [loading,setLoading]=useState(true);const [retry,setRetry]=useState(0);useEffect(()=>{setLoading(true);api<Metric[]>('/admin/analytics').then(result=>{setData(result.data);setError(null);}).catch(setError).finally(()=>setLoading(false));},[retry]);if(!has('analytics.view'))return <div className="cms-notice cms-notice-error">Anda tidak memiliki akses ke Analytics.</div>;const start=Date.now()-range*86400000;const filtered=data.filter(item=>new Date(item.metric_date).getTime()>=start);const names:[string,string][]=[['page_view','Tayangan halaman'],['product_view','Tayangan produk'],['service_view','Tayangan layanan'],['news_view','Tayangan berita'],['product_purchase_link_click','Klik tautan pembelian'],['cta_click','Klik CTA']];return <div className="cms-page"><div className="cms-page-head"><div><span className="cms-eyebrow">AKTIVITAS WEBSITE</span><h1>Analytics</h1><p>Interaksi pengunjung yang dirangkum setiap hari.</p></div><select aria-label="Rentang waktu" value={range} onChange={event=>setRange(Number(event.target.value))}><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option></select></div>{error&&<><Notice error={error}/><button className="cms-button secondary" onClick={()=>setRetry(retry+1)}>Coba lagi</button></>}{loading?<Loading/>:<><div className="cms-stats cms-analytics-stats">{names.map(([name,label])=><div className="cms-card cms-stat" key={name}><span className="cms-stat-icon"><BarChart3 size={18}/></span><strong>{number(filtered.filter(item=>item.metric_name===name).reduce((total,item)=>total+Number(item.metric_value),0))}</strong><span>{label}</span></div>)}</div><div className="cms-card cms-chart-panel"><h2>Aktivitas harian</h2>{filtered.length?<Suspense fallback={<Loading/>}><AnalyticsChart metrics={filtered} range={range}/></Suspense>:<Empty>Belum ada interaksi pada periode ini.</Empty>}</div></>}</div>;
}
