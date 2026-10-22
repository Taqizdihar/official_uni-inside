import {Navigate,Route,Routes,useLocation,useParams} from 'react-router-dom';
import {AuthProvider,useAuth} from './auth/AuthProvider';
import {CmsLayout} from './layouts/CmsLayout';
import {LoginPage,TokenPage,ResetRequestPage} from './pages/AuthPages';
import {DashboardPage,AnalyticsPage} from './pages/OverviewPages';
import {ResourceLandingPage,ResourceEditorPage} from './pages/ResourcePages';
import {MediaPage} from './pages/MediaPage';
import {ServiceCreatePage} from './pages/ServiceCreatePage';
import {ArticleCreatePage} from './pages/ArticleCreatePage';
import {CategoryManagementPage} from './pages/CategoryManagementPage';
import {SocialMediaPage} from './pages/SocialMediaPage';
import {FooterSettingsPage} from './pages/FooterSettingsPage';
import {HeroSettingsPage} from './pages/HeroSettingsPage';
import {categoryResourceFor,categoryUrl} from './categories/model';
import {RolesPage,ProfilePage} from './pages/AdministrationPages';
import {UsersPage,AuditPage} from './pages/AdministrationAccessPages';
import './admin.css';
import './cms-refresh.css';

function Protected(){const {user,loading,offline}=useAuth();const location=useLocation();if(loading)return <div className="cms-auth-screen" role="status">Memeriksa sesi Anda…</div>;if(!user)return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname+location.search)}`} replace state={{offline}}/>;return <CmsLayout/>;}
function Guest({children}:{children:React.ReactNode}){const {user,loading}=useAuth();if(loading)return <div className="cms-auth-screen" role="status">Memeriksa sesi Anda…</div>;return user?<Navigate to="/admin/dashboard" replace/>:<>{children}</>;}
function UserManagementRoute(){const {user,has}=useAuth();return user&&['super_admin','administrator'].includes(user.role_code)&&has('users.view')?<UsersPage/>:<div className="cms-notice cms-notice-error" role="alert">Anda tidak memiliki akses ke Manajemen Pengguna.</div>;}
function LegacyCategoryRedirect({action,resource:fixedResource}:{action?:'create'|'edit';resource?:string}){const {resource,key}=useParams();const tab=categoryResourceFor(fixedResource??resource??'');const id=key?Number(key):undefined;return tab?<Navigate to={categoryUrl(tab,action,id!==undefined&&Number.isSafeInteger(id)&&id>0?id:undefined)} replace/>:<Navigate to="/admin/content/categories" replace/>;}
function CategoryOrResourceLanding(){const {resource}=useParams();return categoryResourceFor(resource??'')?<LegacyCategoryRedirect/>:<ResourceLandingPage/>;}
function HeroOrResourceLanding(){const {resource}=useParams();return ['hero-settings','hero-trust-signals','hero-workspaces','hero-hotspots'].includes(resource??'')?<Navigate to="/admin/homepage/hero-settings" replace/>:<ResourceLandingPage/>;}
function HeroOrResourceEditor(){const {resource}=useParams();return ['hero-settings','hero-trust-signals','hero-workspaces','hero-hotspots'].includes(resource??'')?<Navigate to="/admin/homepage/hero-settings" replace/>:<ResourceEditorPage/>;}
export default function AdminApp(){return <div className="cms" lang="id"><AuthProvider><Routes>
  <Route path="/admin">
  <Route path="login" element={<Guest><LoginPage/></Guest>}/>
  <Route path="accept-invitation" element={<Guest><TokenPage mode="invitation"/></Guest>}/>
  <Route path="forgot-password" element={<Guest><ResetRequestPage/></Guest>}/>
  <Route path="reset-password" element={<Guest><TokenPage mode="reset"/></Guest>}/>
  <Route element={<Protected/>}>
    <Route index element={<Navigate to="dashboard" replace/>}/>
    <Route path="dashboard" element={<DashboardPage/>}/>
    <Route path="analytics" element={<AnalyticsPage/>}/>
    <Route path="homepage/hero-settings" element={<HeroSettingsPage/>}/>
    <Route path="homepage/:resource" element={<HeroOrResourceLanding/>}/>
    <Route path="homepage/:resource/:key" element={<HeroOrResourceEditor/>}/>
    <Route path="site/social-links" element={<SocialMediaPage/>}/>
    <Route path="site/footer" element={<FooterSettingsPage/>}/>
    <Route path="site/site-settings" element={<Navigate to="/admin/site/footer" replace/>}/>
    <Route path="site/site-settings/:key" element={<Navigate to="/admin/site/footer" replace/>}/>
    <Route path="site/:resource" element={<ResourceLandingPage/>}/>
    <Route path="site/:resource/new" element={<ResourceEditorPage create/>}/>
    <Route path="site/:resource/:key" element={<ResourceEditorPage/>}/>
    <Route path="content/categories" element={<CategoryManagementPage/>}/>
    <Route path="content/:resource" element={<CategoryOrResourceLanding/>}/>
    <Route path="content/product-categories/new" element={<LegacyCategoryRedirect resource="product-categories" action="create"/>}/>
    <Route path="content/service-categories/new" element={<LegacyCategoryRedirect resource="service-categories" action="create"/>}/>
    <Route path="content/news-categories/new" element={<LegacyCategoryRedirect resource="news-categories" action="create"/>}/>
    <Route path="content/product-categories/:key" element={<LegacyCategoryRedirect resource="product-categories" action="edit"/>}/>
    <Route path="content/service-categories/:key" element={<LegacyCategoryRedirect resource="service-categories" action="edit"/>}/>
    <Route path="content/news-categories/:key" element={<LegacyCategoryRedirect resource="news-categories" action="edit"/>}/>
    <Route path="content/services/new" element={<ServiceCreatePage/>}/>
    <Route path="content/news/new" element={<ArticleCreatePage/>}/>
    <Route path="content/:resource/new" element={<ResourceEditorPage create/>}/>
    <Route path="content/:resource/:key" element={<ResourceEditorPage/>}/>
    <Route path="media" element={<MediaPage/>}/>
    <Route path="users" element={<UserManagementRoute/>}/>
    <Route path="roles" element={<RolesPage/>}/>
    <Route path="audit" element={<AuditPage/>}/>
    <Route path="profile" element={<ProfilePage/>}/>
  </Route>
  </Route>
  <Route path="*" element={<div className="cms-auth-screen">Halaman tidak ditemukan. <a href="/admin/dashboard">Kembali ke Dashboard</a></div>}/>
</Routes></AuthProvider></div>;}
