import {Navigate,Route,Routes,useLocation} from 'react-router-dom';
import {AuthProvider,useAuth} from './auth/AuthProvider';
import {CmsLayout} from './layouts/CmsLayout';
import {LoginPage,TokenPage,ResetRequestPage} from './pages/AuthPages';
import {DashboardPage,AnalyticsPage} from './pages/OverviewPages';
import {ResourceListPage,ResourceEditorPage} from './pages/ResourcePages';
import {MediaPage} from './pages/MediaPage';
import {UsersPage,RolesPage,AuditPage,ProfilePage} from './pages/AdministrationPages';
import './admin.css';

function Protected(){const {user,loading,offline}=useAuth();const location=useLocation();if(loading)return <div className="cms-auth-screen" role="status">Memeriksa sesi Anda…</div>;if(!user)return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname+location.search)}`} replace state={{offline}}/>;return <CmsLayout/>;}
function Guest({children}:{children:React.ReactNode}){const {user,loading}=useAuth();if(loading)return <div className="cms-auth-screen" role="status">Memeriksa sesi Anda…</div>;return user?<Navigate to="/admin/dashboard" replace/>:<>{children}</>;}
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
    <Route path="homepage/:resource" element={<ResourceListPage/>}/>
    <Route path="homepage/:resource/:key" element={<ResourceEditorPage/>}/>
    <Route path="site/:resource" element={<ResourceListPage/>}/>
    <Route path="site/:resource/new" element={<ResourceEditorPage create/>}/>
    <Route path="site/:resource/:key" element={<ResourceEditorPage/>}/>
    <Route path="content/:resource" element={<ResourceListPage/>}/>
    <Route path="content/:resource/new" element={<ResourceEditorPage create/>}/>
    <Route path="content/:resource/:key" element={<ResourceEditorPage/>}/>
    <Route path="media" element={<MediaPage/>}/>
    <Route path="users" element={<UsersPage/>}/>
    <Route path="roles" element={<RolesPage/>}/>
    <Route path="audit" element={<AuditPage/>}/>
    <Route path="profile" element={<ProfilePage/>}/>
  </Route>
  </Route>
  <Route path="*" element={<div className="cms-auth-screen">Halaman tidak ditemukan. <a href="/admin/dashboard">Kembali ke Dashboard</a></div>}/>
</Routes></AuthProvider></div>;}
