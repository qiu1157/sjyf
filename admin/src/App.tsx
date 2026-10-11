import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './pages/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Services from './pages/Services';
import Categories from './pages/Categories';
import Materials from './pages/Materials';
import Finance from './pages/Finance';
import Coupons from './pages/Coupons';
import Accounts from './pages/Accounts';
import MenuPermission from './pages/MenuPermission';
import Profile from './pages/Profile';
import WxUsers from './pages/WxUsers';
import WxUserDetail from './pages/WxUserDetail';
import Employees from './pages/Employees';
import Leaders from './pages/Leaders';

// 路由守卫：1. 校验登录态 2. 校验当前路径菜单可见性（系统管理员跳过，个人中心/账号管理/菜单权限配置不做菜单校验）
function PrivateRoute({ children }: any) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" />;
  return children;
}

// 菜单守卫包装：未授权菜单路径重定向到 /dashboard
function MenuGuard({ children, menuKey }: any) {
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const menus: string[] = JSON.parse(localStorage.getItem('admin_menus') || '[]');
  // 系统管理员默认全部可见
  if (user.role === 1) return children;
  // 主管按 menus 校验
  if (!menus.includes(menuKey)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<MenuGuard menuKey="dashboard"><Dashboard /></MenuGuard>} />
        <Route path="orders" element={<MenuGuard menuKey="orders"><Orders /></MenuGuard>} />
        <Route path="orders/:id" element={<MenuGuard menuKey="orders"><OrderDetail /></MenuGuard>} />
        <Route path="services" element={<MenuGuard menuKey="services"><Services /></MenuGuard>} />
        <Route path="categories" element={<MenuGuard menuKey="services"><Categories /></MenuGuard>} />
        <Route path="employees" element={<MenuGuard menuKey="employees"><Employees /></MenuGuard>} />
        <Route path="leaders" element={<MenuGuard menuKey="employees"><Leaders /></MenuGuard>} />
        <Route path="materials" element={<MenuGuard menuKey="materials"><Materials /></MenuGuard>} />
        <Route path="finance" element={<MenuGuard menuKey="finance"><Finance /></MenuGuard>} />
        <Route path="coupons" element={<MenuGuard menuKey="coupons"><Coupons /></MenuGuard>} />
        <Route path="wx-users" element={<MenuGuard menuKey="users"><WxUsers /></MenuGuard>} />
        <Route path="wx-users/:id" element={<MenuGuard menuKey="users"><WxUserDetail /></MenuGuard>} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="menu-permission" element={<MenuPermission />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
