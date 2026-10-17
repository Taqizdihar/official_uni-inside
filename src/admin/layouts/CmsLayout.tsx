import {useEffect,useMemo,useRef,useState,type ComponentType} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {BarChart3,BookOpen,BriefcaseBusiness,ChevronDown,ChevronRight,Contact,ExternalLink,FileText,FolderKanban,GalleryVerticalEnd,Gauge,Handshake,History,Home,Image,Layers3,LayoutDashboard,LogOut,Menu,MessageCircle,Newspaper,Package,PenTool,Settings2,ShieldCheck,Sparkles,Tag,Trophy,UserCircle,UserCog,Users,X} from 'lucide-react';
import {useAuth} from '../auth/AuthProvider';
import {catalog,pathFor} from '../resources/catalog';
import {ConfirmDialog} from '../components/Ui';
import {confirmEditorNavigation} from '../dirty';
import {initials,roleLabels} from '../copy';
import {api} from '../api/client';
import {mediaUrl,type Media} from '../components/MediaPicker';
import logoDark from '../../assets/global/Logo - Dark Theme.svg';

type Icon=ComponentType<{size?:number;strokeWidth?:number;className?:string}>;
type Leaf={label:string;path:string;permission:string;icon:Icon};
type Group={label:string;icon:Icon;children:Leaf[]};
type Item=Leaf|Group;
const leaf=(label:string,path:string,permission:string,icon:Icon):Leaf=>({label,path,permission,icon});
const resource=(name:string,label:string,icon:Icon):Leaf=>leaf(label,pathFor(catalog[name]),`${catalog[name].permission}.view`,icon);
const sections:{label:string;items:Item[]}[]=[
  {label:'RINGKASAN',items:[leaf('Dashboard','/admin/dashboard','dashboard.view',LayoutDashboard),leaf('Analytics','/admin/analytics','analytics.view',BarChart3)]},
  {label:'HOMEPAGE',items:[
    {label:'Hero',icon:Sparkles,children:[resource('hero-settings','Konten Hero',PenTool),resource('hero-trust-signals','Trust Signals',Gauge),resource('hero-workspaces','Workspaces',Layers3),resource('hero-hotspots','Callouts',MessageCircle)]},
    {label:'About',icon:BookOpen,children:[resource('about-settings','Konten About',FileText),resource('about-workspaces','About Workspaces',Layers3),resource('about-principles','Principles',Sparkles)]},
    resource('team-section-settings','Our Team',Users),
    leaf('Our Partners','/admin/homepage/homepage-sections/partners','homepage.view',Handshake),
    leaf('Products','/admin/homepage/homepage-sections/products','homepage.view',Package),
    leaf('Services','/admin/homepage/homepage-sections/services','homepage.view',BriefcaseBusiness),
    leaf('News','/admin/homepage/homepage-sections/news','homepage.view',Newspaper),
    resource('achievement-section-settings','Achievements',Trophy),
    resource('contact-section-settings','Contact Us',Contact),
  ]},
  {label:'KONTEN',items:[
    resource('team-members','Team Members',Users),resource('partners','Partners',Handshake),
    {label:'Products',icon:Package,children:[resource('products','Daftar produk',Package),resource('product-categories','Kategori produk',Tag)]},
    {label:'Services',icon:BriefcaseBusiness,children:[resource('services','Daftar layanan',BriefcaseBusiness),resource('service-categories','Kategori layanan',Tag)]},
    resource('projects','Projects',FolderKanban),
    {label:'News',icon:Newspaper,children:[resource('news','Berita dan artikel',Newspaper),resource('news-categories','Kategori berita',Tag)]},
    resource('achievements','Achievements',Trophy),
  ]},
  {label:'MEDIA',items:[leaf('Media Library','/admin/media','media.view',Image)]},
  {label:'WEBSITE',items:[resource('site-settings','Pengaturan website',Settings2),resource('page-settings','Pengaturan halaman',Home),resource('social-links','Social Links',GalleryVerticalEnd),resource('contact-chat-messages','Percakapan Contact Us',MessageCircle)]},
  {label:'ADMINISTRASI',items:[leaf('Pengguna dan undangan','/admin/users','users.view',UserCog),leaf('Role dan permission','/admin/roles','roles.view',ShieldCheck),leaf('Riwayat aktivitas','/admin/audit','audit.view',History)]},
];
const isGroup=(item:Item):item is Group=>'children' in item;
const isActive=(path:string,pathname:string)=>pathname===path||pathname.startsWith(`${path}/`);

export function CmsLayout(){
  const {user,has,logout}=useAuth();const location=useLocation();const navigate=useNavigate();
  const [mobileOpen,setMobileOpen]=useState(false);const [accountOpen,setAccountOpen]=useState(false);
  const [logoutOpen,setLogoutOpen]=useState(false);const [busy,setBusy]=useState(false);
  const [avatarUrl,setAvatarUrl]=useState('');
  const [expanded,setExpanded]=useState<Record<string,boolean>>(()=>{try{return JSON.parse(localStorage.getItem('cms-nav-expanded')||'{}') as Record<string,boolean>;}catch{return {};}});
  const menuButton=useRef<HTMLButtonElement>(null);const sidebar=useRef<HTMLElement>(null);const accountButton=useRef<HTMLButtonElement>(null);
  const visible=useMemo(()=>sections.map(section=>({...section,items:section.items.map(item=>isGroup(item)?{...item,children:item.children.filter(child=>has(child.permission))}:item).filter(item=>isGroup(item)?item.children.length:has(item.permission))})).filter(section=>section.items.length),[has]);
  const allLeaves=visible.flatMap(section=>section.items.flatMap(item=>isGroup(item)?item.children:[item]));
  const title=location.pathname==='/admin/profile'?'Profil saya':allLeaves.find(item=>isActive(item.path,location.pathname))?.label||'Dashboard';
  useEffect(()=>{localStorage.setItem('cms-nav-expanded',JSON.stringify(expanded));},[expanded]);
  useEffect(()=>{if(!user){setAvatarUrl('');return;}let active=true;api<{profile:{avatar_media_id:number|null}}>('/auth/profile').then(result=>result.data.profile.avatar_media_id?api<Media>(`/admin/media/${result.data.profile.avatar_media_id}`):null).then(result=>{if(active)setAvatarUrl(result?mediaUrl(result.data.secure_url,96):'');}).catch(()=>{if(active)setAvatarUrl('');});return()=>{active=false;};},[user]);
  useEffect(()=>{setAccountOpen(false);setMobileOpen(false);},[location.pathname]);
  useEffect(()=>{if(!mobileOpen)return;const previous=document.activeElement as HTMLElement|null;sidebar.current?.focus();const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileOpen(false);if(event.key==='Tab'&&sidebar.current){const controls=[...sidebar.current.querySelectorAll<HTMLElement>('a,button:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(!first||!last)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);(previous??menuButton.current)?.focus();};},[mobileOpen]);
  useEffect(()=>{if(!accountOpen)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setAccountOpen(false);accountButton.current?.focus();}};const onPointer=(event:PointerEvent)=>{if(!(event.target as Element).closest('.cms-account-menu'))setAccountOpen(false);};document.addEventListener('keydown',onKey);document.addEventListener('pointerdown',onPointer);return()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('pointerdown',onPointer);};},[accountOpen]);
  const toggle=(label:string)=>setExpanded(prev=>({...prev,[label]:!prev[label]}));
  const link=(item:Leaf,nested=false)=>{const Icon=item.icon;return <NavLink key={item.path} to={item.path} end={false} className={({isActive:exact})=>`cms-nav-link ${nested?'nested':''} ${exact||isActive(item.path,location.pathname)?'active':''}`} onClick={()=>setMobileOpen(false)}><Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span></NavLink>;};
  async function confirmLogout(){setBusy(true);try{await logout();navigate('/admin/login',{replace:true});}catch{sessionStorage.setItem('cms-logout-notice','Sesi lokal telah ditutup. Server tidak merespons; silakan masuk kembali.');navigate('/admin/login',{replace:true});}finally{setBusy(false);setLogoutOpen(false);}}
  return <div className="cms-shell" onClickCapture={event=>{const target=event.target instanceof Element?event.target.closest('a[href]'):null;if(target instanceof HTMLAnchorElement&&target.origin===window.location.origin&&target.pathname!==window.location.pathname&&!confirmEditorNavigation()){event.preventDefault();event.stopPropagation();}}}>
    {mobileOpen&&<button type="button" className="cms-backdrop show" aria-label="Tutup navigasi" onClick={()=>setMobileOpen(false)}/>}
    <aside ref={sidebar} tabIndex={-1} className={`cms-sidebar ${mobileOpen?'open':''}`} aria-label="Navigasi CMS"><div className="cms-brand"><Link to="/admin/dashboard" aria-label="Uni-Inside CMS, ke Dashboard"><img src={logoDark} alt="Uni-Inside Studio" width="62" height="62"/></Link><span>STUDIO CMS</span><button type="button" className="cms-sidebar-close cms-icon-button" onClick={()=>setMobileOpen(false)} aria-label="Tutup menu"><X size={20}/></button></div>
      <nav aria-label="Navigasi utama">{visible.map(section=><section key={section.label}><h2>{section.label}</h2>{section.items.map(item=>isGroup(item)?(()=>{const Icon=item.icon;const active=item.children.some(child=>isActive(child.path,location.pathname));const open=active||Boolean(expanded[item.label]);return <div className="cms-nav-group" key={item.label}><button type="button" className={`cms-nav-parent ${active?'has-active':''}`} aria-expanded={open} onClick={()=>toggle(item.label)}><Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span>{open?<ChevronDown size={16} aria-hidden="true"/>:<ChevronRight size={16} aria-hidden="true"/>}</button>{open&&<div className="cms-nav-children">{item.children.map(child=>link(child,true))}</div>}</div>;})():link(item))}</section>)}</nav>
      <Link className="cms-sidebar-foot" to="/admin/profile" onClick={()=>setMobileOpen(false)}><span className="cms-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initials(user?.display_name)}</span><span><strong>{user?.display_name}</strong><small>{roleLabels[user?.role_code??'']??user?.role_code}</small></span><ChevronRight size={17} aria-hidden="true"/></Link></aside>
    <div className="cms-workspace"><header className="cms-topbar"><button ref={menuButton} type="button" className="cms-menu-button cms-icon-button" onClick={()=>setMobileOpen(true)} aria-label="Buka menu"><Menu size={21}/></button><div className="cms-breadcrumb"><span>Uni-Inside CMS</span><ChevronRight size={15} aria-hidden="true"/><strong>{title}</strong></div><div className="cms-top-actions"><a href="/" target="_blank" rel="noopener noreferrer" className="cms-preview-link"><span>Lihat website</span><ExternalLink size={16} aria-hidden="true"/></a><div className="cms-account-menu"><button ref={accountButton} type="button" className="cms-account-trigger" aria-expanded={accountOpen} aria-haspopup="menu" onClick={()=>setAccountOpen(!accountOpen)}><span className="cms-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initials(user?.display_name)}</span><span className="cms-account-name"><strong>{user?.display_name}</strong><small>{roleLabels[user?.role_code??'']??user?.role_code}</small></span><ChevronDown size={16} aria-hidden="true"/></button>{accountOpen&&<div className="cms-user-dropdown" role="menu"><span>{user?.email}</span><Link role="menuitem" to="/admin/profile"><UserCircle size={17}/>Profil saya</Link><Link role="menuitem" to="/admin/profile#keamanan"><ShieldCheck size={17}/>Keamanan akun</Link><button role="menuitem" type="button" onClick={()=>{setAccountOpen(false);accountButton.current?.focus();setLogoutOpen(true);}}><LogOut size={17}/>Keluar</button></div>}</div></div></header><main className="cms-main" id="cms-main"><Outlet/></main></div>
    {logoutOpen&&<ConfirmDialog title="Keluar dari Uni-Inside CMS?" icon={LogOut} confirmLabel="Keluar" cancelLabel="Tetap di sini" busy={busy} onCancel={()=>setLogoutOpen(false)} onConfirm={()=>void confirmLogout()}><p>Anda akan keluar dari sesi {user?.email??'ini'}. Masuk kembali untuk melanjutkan pekerjaan.</p></ConfirmDialog>}
  </div>;
}
