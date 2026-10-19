import {useEffect,useMemo,useRef,useState,type ComponentType} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {BarChart3,BookOpen,BriefcaseBusiness,ChevronRight,Contact,ExternalLink,FileText,FolderKanban,History,Image,LayoutDashboard,LogOut,Menu,Newspaper,Package,Settings2,ShieldCheck,Sparkles,Tag,Trophy,UserCircle,UserCog,Users,X} from 'lucide-react';
import {useAuth} from '../auth/AuthProvider';
import {catalog,pathFor} from '../resources/catalog';
import {ConfirmDialog} from '../components/Ui';
import {confirmEditorNavigation} from '../dirty';
import {initials,roleLabels} from '../copy';
import {api} from '../api/client';
import {mediaUrl,type Media} from '../components/MediaPicker';
import logoDark from '../../assets/global/Logo - Dark Theme.svg';

type Icon=ComponentType<{size?:number;strokeWidth?:number;className?:string}>;
type Destination={label:string;icon:Icon;permission:string;path?:string;children?:Destination[]};
type Section={label:string;items:Destination[]};
const destination=(label:string,permission:string,icon:Icon,path?:string):Destination=>({label,permission,icon,path});
const resource=(name:string,label:string,icon:Icon)=>destination(label,`${catalog[name].permission}.view`,icon,pathFor(catalog[name]));
const sections:Section[]=[
  {label:'RINGKASAN',items:[destination('Dashboard','dashboard.view',LayoutDashboard,'/admin/dashboard'),destination('Analitik','analytics.view',BarChart3,'/admin/analytics')]},
  {label:'MANAJEMEN ASET',items:[destination('Aset Gambar','media.view',Image,'/admin/media')]},
  {label:'POSTINGAN',items:[resource('products','Produk',Package),resource('services','Jasa/Layanan',BriefcaseBusiness),resource('news','Artikel',Newspaper),{label:'Manajemen Kategori',icon:Tag,permission:'',children:[resource('product-categories','Kategori Produk',Tag),resource('service-categories','Kategori Layanan',Tag),resource('news-categories','Kategori Artikel',Tag)]}]},
  {label:'HALAMAN UTAMA',items:[
    resource('hero-settings','Hero',Sparkles),resource('about-settings','About Us',BookOpen),resource('team-section-settings','Our Team',Users),
    destination('Products','homepage.view',Package,'/admin/homepage/homepage-sections/products'),
    destination('Services','homepage.view',BriefcaseBusiness,'/admin/homepage/homepage-sections/services'),
    destination('News','homepage.view',Newspaper,'/admin/homepage/homepage-sections/news'),
    resource('achievement-section-settings','Achievements',Trophy),resource('contact-section-settings','Contact Us',Contact),
  ]},
  {label:'HALAMAN LANJUTAN',items:[
    destination('Media Kit','settings.view',FileText,'/admin/site/page-settings/media_kit'),resource('projects','Projects',FolderKanban),
    destination('Products','settings.view',Package,'/admin/site/page-settings/products'),destination('Services','settings.view',BriefcaseBusiness,'/admin/site/page-settings/services'),destination('Uni-Tools','settings.view',Sparkles),
  ]},
  {label:'PENGATURAN',items:[resource('social-links','Sosial Media',ExternalLink),resource('site-settings','Footer',Settings2)]},
  {label:'ADMINISTRASI',items:[
    destination('Manajemen Pengguna','users.view',UserCog,'/admin/users'),destination('Role & Akses','roles.view',ShieldCheck,'/admin/roles'),
    destination('Riwayat Aktivitas','audit.view',History,'/admin/audit'),
  ]},
];
const isActive=(path:string,pathname:string)=>pathname===path||pathname.startsWith(`${path}/`);

export function CmsLayout(){
  const {user,has,logout}=useAuth();const location=useLocation();const navigate=useNavigate();
  const [mobileOpen,setMobileOpen]=useState(false);const [accountOpen,setAccountOpen]=useState(false);const [categoryOpen,setCategoryOpen]=useState(()=>location.pathname.includes('-categories'));
  const [logoutOpen,setLogoutOpen]=useState(false);const [busy,setBusy]=useState(false);
  const [avatarUrl,setAvatarUrl]=useState('');
  const menuButton=useRef<HTMLButtonElement>(null);const sidebar=useRef<HTMLElement>(null);const accountButton=useRef<HTMLButtonElement>(null);const accountMenu=useRef<HTMLDivElement>(null);
  const visible=useMemo(()=>sections.map(section=>({...section,items:section.items.map(item=>item.children?{...item,children:item.children.filter(child=>has(child.permission))}:item).filter(item=>item.children?item.children.length:has(item.permission))})).filter(section=>section.items.length),[has]);
  useEffect(()=>{if(!user){setAvatarUrl('');return;}let active=true;api<{profile:{avatar_media_id:number|null}}>('/auth/profile').then(result=>result.data.profile.avatar_media_id?api<Media>(`/admin/media/${result.data.profile.avatar_media_id}`):null).then(result=>{if(active)setAvatarUrl(result?mediaUrl(result.data.secure_url,96):'');}).catch(()=>{if(active)setAvatarUrl('');});return()=>{active=false;};},[user]);
  useEffect(()=>{setAccountOpen(false);setMobileOpen(false);},[location.pathname]);
  useEffect(()=>{if(!mobileOpen)return;const previous=document.activeElement as HTMLElement|null;sidebar.current?.focus();const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileOpen(false);if(event.key==='Tab'&&sidebar.current){const controls=[...sidebar.current.querySelectorAll<HTMLElement>('a,button:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(!first||!last)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('keydown',onKey);(previous??menuButton.current)?.focus();};},[mobileOpen]);
  useEffect(()=>{if(!accountOpen)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setAccountOpen(false);accountButton.current?.focus();}if(event.key==='ArrowDown'&&document.activeElement===accountButton.current){event.preventDefault();accountMenu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();}if((event.key==='ArrowDown'||event.key==='ArrowUp')&&accountMenu.current?.contains(document.activeElement)){const items=[...accountMenu.current.querySelectorAll<HTMLElement>('[role="menuitem"]')];const index=items.indexOf(document.activeElement as HTMLElement);if(index>=0){event.preventDefault();items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}}};const onPointer=(event:PointerEvent)=>{if(event.target instanceof Node&&!accountMenu.current?.contains(event.target)&&!accountButton.current?.contains(event.target))setAccountOpen(false);};document.addEventListener('keydown',onKey);document.addEventListener('pointerdown',onPointer);return()=>{document.removeEventListener('keydown',onKey);document.removeEventListener('pointerdown',onPointer);};},[accountOpen]);
  async function confirmLogout(){setBusy(true);try{await logout();navigate('/admin/login',{replace:true});}catch{sessionStorage.setItem('cms-logout-notice','Sesi lokal telah ditutup. Server tidak merespons; silakan masuk kembali.');navigate('/admin/login',{replace:true});}finally{setBusy(false);setLogoutOpen(false);}}
  return <div className="cms-shell" onClickCapture={event=>{const target=event.target instanceof Element?event.target.closest('a[href]'):null;if(target instanceof HTMLAnchorElement&&target.origin===window.location.origin&&target.pathname!==window.location.pathname&&!confirmEditorNavigation()){event.preventDefault();event.stopPropagation();}}}>
    {mobileOpen&&<button type="button" className="cms-backdrop show" aria-label="Tutup navigasi" onClick={()=>setMobileOpen(false)}/>}
    <aside ref={sidebar} tabIndex={-1} className={`cms-sidebar ${mobileOpen?'open':''}`} aria-label="Navigasi CMS"><div className="cms-brand"><Link to="/admin/dashboard" aria-label="Uni-Inside CMS, ke Dashboard"><img src={logoDark} alt="Uni-Inside Studio" width="62" height="62"/></Link><span>Internal CMS</span><button type="button" className="cms-sidebar-close cms-icon-button" onClick={()=>setMobileOpen(false)} aria-label="Tutup menu"><X size={20}/></button></div>
      <nav aria-label="Navigasi utama">{visible.map(section=><section key={section.label}><h2>{section.label}</h2>{section.items.map(item=>{const Icon=item.icon;return item.children?<div className="cms-nav-category" key={`${section.label}-${item.label}`}><button type="button" className="cms-nav-link cms-nav-category-toggle" aria-expanded={categoryOpen} onClick={()=>setCategoryOpen(value=>!value)}><Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span><ChevronRight size={15} className="cms-nav-category-chevron" aria-hidden="true"/></button>{categoryOpen&&<div className="cms-nav-category-children">{item.children.map(child=>{const ChildIcon=child.icon;return <NavLink key={child.label} to={child.path!} className={`cms-nav-link ${isActive(child.path!,location.pathname)?'active':''}`} aria-current={isActive(child.path!,location.pathname)?'page':undefined} onClick={()=>setMobileOpen(false)}><ChildIcon size={16} aria-hidden="true"/><span>{child.label}</span></NavLink>;})}</div>}</div>:item.path?<NavLink key={`${section.label}-${item.label}`} to={item.path} className={`cms-nav-link ${isActive(item.path,location.pathname)?'active':''}`} aria-current={isActive(item.path,location.pathname)?'page':undefined} onClick={()=>setMobileOpen(false)}><Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span></NavLink>:<span key={`${section.label}-${item.label}`} className="cms-nav-link cms-nav-disabled" aria-disabled="true" title="Halaman belum tersedia"><Icon size={18} strokeWidth={1.8} aria-hidden="true"/><span>{item.label}</span></span>;})}</section>)}</nav>
      <Link className="cms-sidebar-foot" to="/admin/profile" onClick={()=>setMobileOpen(false)}><span className="cms-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initials(user?.display_name)}</span><span><strong>{user?.display_name}</strong><small>{roleLabels[user?.role_code??'']??user?.role_code}</small></span><ChevronRight size={17} aria-hidden="true"/></Link></aside>
    <div className="cms-workspace"><header className="cms-topbar"><button ref={menuButton} type="button" className="cms-menu-button cms-icon-button" onClick={()=>setMobileOpen(true)} aria-label="Buka menu"><Menu size={21}/></button><span className="cms-topbar-title">Internal CMS</span><div className="cms-top-actions"><a href="/" target="_blank" rel="noopener noreferrer" className="cms-preview-link"><span>Lihat Web</span><ExternalLink size={17} aria-hidden="true"/></a><div className="cms-account-menu"><button ref={accountButton} type="button" className="cms-account-trigger" aria-expanded={accountOpen} aria-haspopup="menu" onClick={()=>setAccountOpen(!accountOpen)} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setAccountOpen(true);requestAnimationFrame(()=>accountMenu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());}}}><span className="cms-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initials(user?.display_name)}</span><span className="cms-account-name"><strong>{user?.display_name}</strong><small>{roleLabels[user?.role_code??'']??user?.role_code}</small></span><span className="cms-account-arrow"><ChevronRight size={18} aria-hidden="true"/></span></button>{accountOpen&&<div className="cms-user-dropdown" ref={accountMenu} role="menu"><span>{user?.email}</span><Link role="menuitem" to="/admin/profile"><UserCircle size={17}/>Profil saya</Link><Link role="menuitem" to="/admin/profile#keamanan"><ShieldCheck size={17}/>Keamanan akun</Link><button role="menuitem" type="button" onClick={()=>{setAccountOpen(false);accountButton.current?.focus();setLogoutOpen(true);}}><LogOut size={17}/>Keluar</button></div>}</div></div></header><main className="cms-main" id="cms-main"><Outlet/></main></div>
    {logoutOpen&&<ConfirmDialog title="Keluar dari Uni-Inside CMS?" icon={LogOut} confirmLabel="Keluar" cancelLabel="Tetap di sini" busy={busy} onCancel={()=>setLogoutOpen(false)} onConfirm={()=>void confirmLogout()}><p>Anda akan keluar dari sesi {user?.email??'ini'}. Masuk kembali untuk melanjutkan pekerjaan.</p></ConfirmDialog>}
  </div>;
}
