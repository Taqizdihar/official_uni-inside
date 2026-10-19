import {lazy,Suspense,useEffect,useState} from 'react';
import {Activity,BriefcaseBusiness,Eye,FilePenLine,FileText,History,MousePointer2,MousePointerClick,Newspaper,Package,Plus,Users,Zap} from 'lucide-react';
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
type Metric={metric_date:string;metric_name:string;metric_value:number|null};
const analyticsMetrics=[
  {name:'page_view',label:'Tayangan halaman',icon:FileText},
  {name:'product_view',label:'Tayangan produk',icon:Package},
  {name:'service_view',label:'Tayangan layanan',icon:BriefcaseBusiness},
  {name:'news_view',label:'Tayangan berita',icon:Newspaper},
  {name:'product_purchase_link_click',label:'Klik tautan pembelian',icon:MousePointerClick},
  {name:'cta_click',label:'Klik CTA',icon:MousePointer2},
] as const;
const utcDay=(date:Date)=>date.toISOString().slice(0,10);
const metricTotal=(metrics:Metric[],name:string)=>{
  const values=metrics.filter(item=>item.metric_name===name).map(item=>item.metric_value===null?NaN:Number(item.metric_value));
  return values.every(Number.isFinite)?values.reduce((total,value)=>total+value,0):null;
};

export function AnalyticsPage(){
  const {has}=useAuth();
  const [range,setRange]=useState(30);
  const [data,setData]=useState<Metric[]>([]);
  const [error,setError]=useState<unknown>(null);
  const [loading,setLoading]=useState(true);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setLoading(true);setError(null);
    api<Metric[]>('/admin/analytics').then(result=>{if(active)setData(result.data);}).catch(cause=>{if(active){setData([]);setError(cause);}}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[retry]);
  if(!has('analytics.view'))return <div className="cms-notice cms-notice-error">Anda tidak memiliki akses ke Analitik.</div>;
  const today=new Date();today.setUTCHours(0,0,0,0);
  const start=new Date(today);start.setUTCDate(start.getUTCDate()-(range-1));
  const firstDay=utcDay(start);const lastDay=utcDay(today);
  const filtered=data.filter(item=>{const day=item.metric_date?.slice(0,10);return day>=firstDay&&day<=lastDay;});
  const hasInvalidData=filtered.some(item=>item.metric_value===null||!Number.isFinite(Number(item.metric_value)));
  const mayBeLimited=data.length>=500;
  const hasActivity=filtered.some(item=>item.metric_value!==null&&Number(item.metric_value)>0);
  return <div className="cms-page cms-analytics-page">
    <div className="cms-page-head cms-analytics-head"><div><h1>Analitik</h1><p>Interaksi pengunjung yang dirangkum setiap hari.</p></div><label className="cms-analytics-period">Periode <select value={range} onChange={event=>setRange(Number(event.target.value))} aria-label="Periode analitik"><option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option></select></label></div>
    {loading?<div role="status" aria-label="Memuat analitik"><div className="cms-analytics-cards">{analyticsMetrics.map(metric=><div className="cms-card cms-analytics-card cms-analytics-loading-card" key={metric.name}><span className="cms-analytics-skeleton-icon"/><span className="cms-analytics-skeleton-value"/><span className="cms-analytics-skeleton-label"/></div>)}</div><section className="cms-card cms-analytics-panel"><div className="cms-panel-head"><Activity size={21} aria-hidden="true"/><h2>Aktivitas harian</h2></div><div className="cms-analytics-loading-chart"/></section></div>:error?<div className="cms-card cms-analytics-error"><Notice error={error}/><button type="button" className="cms-button secondary" onClick={()=>setRetry(value=>value+1)}>Coba lagi</button></div>:<>
      {mayBeLimited&&<div className="cms-notice" role="status">Sebagian data aktivitas mungkin belum tampil. Coba periode lebih singkat.</div>}
      <div className="cms-analytics-cards">{analyticsMetrics.map(({name,label,icon:Icon})=>{const value=metricTotal(filtered,name);return <div className="cms-card cms-analytics-card" key={name}><div className="cms-analytics-card-top"><span className="cms-analytics-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true"/></span><span className="cms-analytics-value" aria-label={value===null?`${label}: data belum tersedia`:undefined}>{value===null?'—':number(value)}</span></div><span className="cms-analytics-label">{label}</span>{value===null&&<small>Data belum tersedia</small>}</div>;})}</div>
      <section className="cms-card cms-analytics-panel"><div className="cms-panel-head"><Activity size={21} aria-hidden="true"/><h2>Aktivitas harian</h2></div>{hasInvalidData?<div className="cms-dashboard-empty cms-analytics-empty"><Activity size={30} aria-hidden="true"/><span>Data aktivitas harian belum tersedia.</span></div>:hasActivity?<Suspense fallback={<Loading/>}><AnalyticsChart metrics={filtered} range={range} endDay={lastDay}/></Suspense>:<div className="cms-dashboard-empty cms-analytics-empty"><Activity size={30} aria-hidden="true"/><span>Belum ada interaksi pada periode ini.</span></div>}</section>
    </>}
  </div>;
}
